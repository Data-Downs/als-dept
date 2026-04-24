"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { useAppStore } from "@/lib/store";

const VOICE_TRANSCRIPT = "Can you remind me to register the birth?";
const RECORDING_DURATION_MS = 2800; // how long the waveform plays
const TRANSCRIBING_DURATION_MS = 1400; // "Transcribing..." display time

type VoiceState = "idle" | "recording" | "transcribing";

// ── Waveform animation component ──
function WaveformAnimation() {
  return (
    <div className="flex items-center gap-[2px] h-full px-2 waveform-container">
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="waveform-bar"
          style={{
            animationDelay: `${i * 0.04}s`,
          }}
        />
      ))}
    </div>
  );
}

export function MessageInput() {
  const [text, setText] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const isLoading = useAppStore((s) => s.isLoading);
  const currentView = useAppStore((s) => s.currentView);
  const currentService = useAppStore((s) => s.currentService);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const startNewConversation = useAppStore((s) => s.startNewConversation);
  const agent = useAppStore((s) => s.agent);
  const conversationHistory = useAppStore((s) => s.conversationHistory);
  const autoTypeMessage = useAppStore((s) => s.autoTypeMessage);

  // ── Auto-type animation (demo-mode scripted opener) ──
  useEffect(() => {
    if (!autoTypeMessage) return;
    const message = autoTypeMessage;
    let cancelled = false;
    let i = 1;
    let timer: ReturnType<typeof setTimeout>;

    const resize = () => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    };

    const typeNext = () => {
      if (cancelled) return;
      setText(message.slice(0, i));
      resize();
      if (i < message.length) {
        i++;
        timer = setTimeout(typeNext, 35 + Math.random() * 45);
      } else {
        timer = setTimeout(() => {
          if (cancelled) return;
          useAppStore.setState({ autoTypeMessage: null });
          setText("");
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
          void useAppStore.getState().sendMessage(message);
        }, 450);
      }
    };
    typeNext();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [autoTypeMessage]);

  // ── Voice recording flow ──
  const handleMicTap = useCallback(() => {
    if (voiceState !== "idle" || isLoading) return;

    // Start recording
    setVoiceState("recording");

    // After recording duration, transition to transcribing
    setTimeout(() => {
      setVoiceState("transcribing");

      // After transcribing, submit the message
      setTimeout(() => {
        setVoiceState("idle");
        setText("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        sendMessage(VOICE_TRANSCRIPT);
      }, TRANSCRIBING_DURATION_MS);
    }, RECORDING_DURATION_MS);
  }, [voiceState, isLoading, sendMessage]);

  // Stop recording early on tap
  const handleStopRecording = useCallback(() => {
    if (voiceState !== "recording") return;
    setVoiceState("transcribing");

    setTimeout(() => {
      setVoiceState("idle");
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      sendMessage(VOICE_TRANSCRIPT);
    }, TRANSCRIBING_DURATION_MS);
  }, [voiceState, sendMessage]);

  const agentName = agent === "max" ? "Max" : "Dot";
  const placeholder = `Ask ${agentName} a question`;

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    if (currentView !== "chat") {
      startNewConversation(currentService);
      navigateTo("chat", currentService);
    }

    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await sendMessage(trimmed);
  }, [
    text,
    isLoading,
    currentView,
    currentService,
    sendMessage,
    navigateTo,
    startNewConversation,
  ]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  };

  const hasText = text.trim().length > 0;
  const isRecording = voiceState === "recording";
  const isTranscribing = voiceState === "transcribing";
  const isVoiceActive = voiceState !== "idle";

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-2.5 w-full">
      <div className="flex items-center gap-2 max-w-[960px] mx-auto">
        {/* Left button — plus (default) or stop (recording) */}
        {isRecording ? (
          <button
            type="button"
            onClick={handleStopRecording}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 text-govuk-blue touch-feedback"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
            aria-label="Stop recording"
          >
            <span
              className="block bg-govuk-blue"
              style={{ width: 12, height: 12, borderRadius: 2 }}
            />
          </button>
        ) : (
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 text-govuk-blue touch-feedback"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
            aria-label="Attach"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}

        {/* Input pill */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex items-center flex-1 min-w-0 bg-gray-100 rounded-full pr-1"
          style={{ minHeight: "36px" }}
        >
          {/* Recording state — waveform animation */}
          {isRecording && (
            <div className="flex-1 flex items-center h-[36px] overflow-hidden">
              <WaveformAnimation />
            </div>
          )}

          {/* Transcribing state — animated dots */}
          {isTranscribing && (
            <div className="flex-1 flex items-center h-[36px] pl-4">
              <span className="text-sm text-govuk-dark-grey">
                Transcribing
                <span className="transcribing-dots" />
              </span>
            </div>
          )}

          {/* Normal state — textarea */}
          {!isVoiceActive && (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleInput();
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm focus:outline-none placeholder:text-govuk-mid-grey py-2 pl-4 pr-1"
              style={{ lineHeight: "1.4" }}
              aria-label="Message input"
            />
          )}

          {/* Right icon */}
          {isRecording ? (
            <button
              type="button"
              onClick={handleStopRecording}
              className="w-7 h-7 rounded-full bg-govuk-blue flex items-center justify-center shrink-0 mr-0.5 touch-feedback"
              aria-label="Send voice message"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          ) : isTranscribing ? (
            <div className="w-7 h-7 flex items-center justify-center shrink-0 mr-0.5">
              <div className="w-4 h-4 rounded-full border-2 border-govuk-blue border-t-transparent animate-spin" />
            </div>
          ) : hasText ? (
            <button
              type="submit"
              disabled={isLoading}
              className="w-7 h-7 rounded-full bg-govuk-blue flex items-center justify-center shrink-0 disabled:opacity-40 transition-colors touch-feedback mr-0.5"
              aria-label="Send message"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleMicTap}
              disabled={isLoading}
              className="w-7 h-7 flex items-center justify-center shrink-0 text-govuk-dark-grey transition-colors touch-feedback mr-1"
              aria-label="Speak"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
