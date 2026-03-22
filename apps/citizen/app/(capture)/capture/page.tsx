"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toPng } from "html-to-image";
import type { ChatMessage, Conversation } from "@/lib/types";
import { PERSONA_NAMES } from "@/lib/persona-meta";

/**
 * Full-length capture page — renders a conversation without the phone frame,
 * optimised for screenshots and sharing.
 *
 * Data sources (checked in order):
 * 1. In-memory Zustand store (same-tab navigation)
 * 2. localStorage conversations (new-tab via capture button)
 *
 * URL params:
 * - ?persona=<id>         — which persona's conversations to look at
 * - ?conversation=<id>    — specific conversation ID
 * - (no params)           — uses the active store state
 */

function getConversationsFromStorage(personaId: string): Conversation[] {
  try {
    const raw = localStorage.getItem(`c02_conversations_${personaId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function findConversation(
  personaId: string | null,
  conversationId: string | null,
): { messages: ChatMessage[]; title: string | null; agent: string; persona: string } | null {
  if (!personaId) return null;

  const convos = getConversationsFromStorage(personaId);
  if (convos.length === 0) return null;

  const convo = conversationId
    ? convos.find((c) => c.id === conversationId)
    : convos[0]; // most recent

  if (!convo || convo.messages.length === 0) return null;

  return {
    messages: convo.messages,
    title: convo.title || null,
    agent: convo.agent || "dot",
    persona: personaId,
  };
}

function CaptureHeader({
  personaName,
  agentName,
  title,
}: {
  personaName: string;
  agentName: string;
  title: string | null;
}) {
  return (
    <div className="bg-govuk-blue text-white px-6 py-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium opacity-80 uppercase tracking-wider">
            GOV.UK
          </div>
          <div className="text-lg font-bold mt-1">
            {title || "Conversation"}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="opacity-80">{personaName}</div>
          <div className="font-medium">Agent: {agentName}</div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isUser,
}: {
  message: ChatMessage;
  isUser: boolean;
}) {
  if (typeof message.content !== "string") return null;

  // Strip special markers for capture view
  const content = message.content
    .replace(/\[PLAN_CARDS\]/g, "")
    .replace(/\[REGISTER_BIRTH_CARD\]/g, "")
    .replace(/\[APPLICATION_RECEIPT\]/g, "")
    .replace(/\[TASK_RECEIPT\]\n?/g, "")
    .trim();

  if (!content) return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-govuk-blue text-white rounded-br-sm whitespace-pre-wrap"
            : "bg-white text-govuk-black prose prose-sm prose-neutral max-w-none shadow-sm"
        }`}
      >
        {isUser ? (
          content
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function ExportToolbar({
  onDownloadPng,
  onDownloadHtml,
  isExporting,
}: {
  onDownloadPng: () => void;
  onDownloadHtml: () => void;
  isExporting: boolean;
}) {
  return (
    <div className="fixed top-0 right-0 z-50 p-4 flex gap-2 print:hidden">
      <button
        onClick={onDownloadHtml}
        className="bg-white border border-gray-300 text-govuk-black px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:bg-gray-50 transition-colors"
      >
        Download HTML
      </button>
      <button
        onClick={onDownloadPng}
        disabled={isExporting}
        className="bg-govuk-blue text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:bg-govuk-dark-blue transition-colors disabled:opacity-50"
      >
        {isExporting ? "Exporting…" : "Download PNG"}
      </button>
    </div>
  );
}

function BackLink() {
  return (
    <div className="fixed top-0 left-0 z-50 p-4 print:hidden">
      <a
        href="/"
        className="text-sm text-govuk-blue hover:underline font-medium bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm"
      >
        ← Back to app
      </a>
    </div>
  );
}

/** List all personas with conversations in localStorage */
function ConversationPicker({
  onSelect,
}: {
  onSelect: (personaId: string, conversationId: string) => void;
}) {
  const [convos, setConvos] = useState<
    Array<{ personaId: string; conversation: Conversation }>
  >([]);

  useEffect(() => {
    const results: Array<{ personaId: string; conversation: Conversation }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("c02_conversations_")) continue;
      const personaId = key.replace("c02_conversations_", "");
      try {
        const parsed: Conversation[] = JSON.parse(localStorage.getItem(key) || "[]");
        for (const c of parsed) {
          if (c.messages.length > 0) {
            results.push({ personaId, conversation: c });
          }
        }
      } catch {
        /* skip */
      }
    }
    // Sort by most recent
    results.sort(
      (a, b) =>
        new Date(b.conversation.updatedAt).getTime() -
        new Date(a.conversation.updatedAt).getTime(),
    );
    setConvos(results);
  }, []);

  if (convos.length === 0) {
    return (
      <p className="text-govuk-dark-grey text-sm">
        No conversations found. Start a conversation in the app first.
      </p>
    );
  }

  return (
    <div className="space-y-3 max-w-md w-full">
      <h2 className="text-lg font-bold text-govuk-black">
        Select a conversation to capture
      </h2>
      {convos.map(({ personaId, conversation }) => (
        <button
          key={conversation.id}
          onClick={() => onSelect(personaId, conversation.id)}
          className="w-full text-left bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
        >
          <div className="font-medium text-govuk-black">
            {conversation.title || "Untitled conversation"}
          </div>
          <div className="text-xs text-govuk-dark-grey mt-1">
            {PERSONA_NAMES[personaId] || personaId} · {conversation.agent || "dot"} ·{" "}
            {conversation.messages.length} messages
          </div>
          <div className="text-xs text-govuk-mid-grey mt-0.5">
            {new Date(conversation.updatedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </button>
      ))}
    </div>
  );
}

export default function CapturePage() {
  // Try in-memory store first
  const storeMessages = useAppStore((s) => s.conversationHistory);
  const storePersona = useAppStore((s) => s.persona);
  const storePersonaData = useAppStore((s) => s.personaData);
  const storeAgent = useAppStore((s) => s.agent);
  const storeConversation = useAppStore((s) => s.activeConversation);

  const captureRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // State for localStorage-sourced data
  const [selectedData, setSelectedData] = useState<{
    messages: ChatMessage[];
    title: string | null;
    agent: string;
    persona: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);

    // Check URL params for direct linking
    const params = new URLSearchParams(window.location.search);
    const paramPersona = params.get("persona");
    const paramConversation = params.get("conversation");

    if (paramPersona) {
      const data = findConversation(paramPersona, paramConversation);
      if (data) setSelectedData(data);
    }
  }, []);

  // Determine which data source to use
  const hasStoreData = storeMessages.length > 0;
  const data = hasStoreData
    ? {
        messages: storeMessages,
        title: storeConversation?.title ?? null,
        agent: storeAgent,
        persona: storePersona || "unknown",
      }
    : selectedData;

  const personaName = hasStoreData
    ? storePersonaData
      ? `${storePersonaData.givenName} ${storePersonaData.familyName}`
      : storePersona || "Unknown"
    : data
      ? PERSONA_NAMES[data.persona] || data.persona
      : "Unknown";

  const agentName = data
    ? data.agent === "max"
      ? "Max"
      : data.agent === "dot"
        ? "Dot"
        : "None"
    : "Unknown";

  const generateFilename = useCallback(
    (ext: string) => {
      const slug = (data?.title || "conversation")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
      return `${slug}_${ts}.${ext}`;
    },
    [data?.title],
  );

  const handleDownloadPng = useCallback(async () => {
    if (!captureRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        backgroundColor: "#eaf1f7",
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = generateFilename("png");
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("PNG export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [generateFilename]);

  const handleDownloadHtml = useCallback(() => {
    if (!captureRef.current) return;

    const styles = Array.from(
      document.querySelectorAll("style, link[rel='stylesheet']"),
    )
      .map((el) => el.outerHTML)
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data?.title || "Conversation"} — GOV.UK Capture</title>
  ${styles}
  <style>
    body { margin: 0; background: #eaf1f7; }
  </style>
</head>
<body>
  ${captureRef.current.outerHTML}
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = generateFilename("html");
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [data?.title, generateFilename]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-govuk-page-bg flex items-center justify-center">
        <p className="text-govuk-dark-grey text-sm">Loading…</p>
      </div>
    );
  }

  // No data from store or URL params — show conversation picker
  if (!data) {
    return (
      <div className="min-h-screen bg-govuk-page-bg flex flex-col items-center justify-center gap-4 px-4">
        <BackLink />
        <ConversationPicker
          onSelect={(personaId, conversationId) => {
            const found = findConversation(personaId, conversationId);
            if (found) {
              setSelectedData(found);
              // Update URL without reload
              const url = new URL(window.location.href);
              url.searchParams.set("persona", personaId);
              url.searchParams.set("conversation", conversationId);
              window.history.replaceState({}, "", url.toString());
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-govuk-page-bg">
      <BackLink />
      <ExportToolbar
        onDownloadPng={handleDownloadPng}
        onDownloadHtml={handleDownloadHtml}
        isExporting={isExporting}
      />

      {/* Capturable area — full-length, no viewport clipping */}
      <div className="max-w-[440px] mx-auto py-8 px-4">
        <div
          ref={captureRef}
          className="bg-govuk-page-bg rounded-2xl overflow-hidden shadow-xl"
          data-capture-root
        >
          <CaptureHeader
            personaName={personaName}
            agentName={agentName}
            title={data.title}
          />

          <div className="px-4 py-4 space-y-3">
            {data.messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                isUser={msg.role === "user"}
              />
            ))}
          </div>

          {/* Footer with timestamp */}
          <div className="px-6 py-4 border-t border-gray-200/50 text-xs text-govuk-mid-grey">
            Captured{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" · "}
            {data.messages.length} messages
            {" · "}
            GOV.UK Agent Demo
          </div>
        </div>
      </div>
    </div>
  );
}
