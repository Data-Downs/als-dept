"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { useAppStore } from "@/lib/store";

export function MessageInput() {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const isLoading = useAppStore((s) => s.isLoading);
  const currentView = useAppStore((s) => s.currentView);
  const currentService = useAppStore((s) => s.currentService);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const startNewConversation = useAppStore((s) => s.startNewConversation);
  const agent = useAppStore((s) => s.agent);

  const handleMicTap = useCallback(() => {
    if (isListening || isLoading) return;
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      setText("What support can I get for my family?");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    }, 2000);
  }, [isListening, isLoading]);

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
  }, [text, isLoading, currentView, currentService, sendMessage, navigateTo, startNewConversation]);

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

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-2.5 w-full">
      <div className="flex items-center gap-2 max-w-[960px] mx-auto">
        {/* Plus button — white disk with shadow, blue plus */}
        <button
          type="button"
          className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 text-govuk-blue touch-feedback"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
          aria-label="Attach"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Input pill — mic/submit button lives INSIDE on the right */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex items-center flex-1 min-w-0 bg-gray-100 rounded-full pr-1"
          style={{ minHeight: "36px" }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleInput();
            }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : placeholder}
            rows={1}
            disabled={isListening}
            className="flex-1 resize-none bg-transparent text-sm focus:outline-none disabled:opacity-60 placeholder:text-govuk-mid-grey py-2 pl-4 pr-1"
            style={{ lineHeight: "1.4" }}
            aria-label="Message input"
          />

          {/* Right icon — mic when empty, blue submit arrow when typing, red pulse when listening */}
          {isListening ? (
            <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0 animate-pulse mr-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              </svg>
            </div>
          ) : hasText ? (
            <button
              type="submit"
              disabled={isLoading}
              className="w-7 h-7 rounded-full bg-govuk-blue flex items-center justify-center shrink-0 disabled:opacity-40 transition-colors touch-feedback mr-0.5"
              aria-label="Send message"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleMicTap}
              disabled={isLoading}
              className="w-7 h-7 flex items-center justify-center shrink-0 text-govuk-dark-grey hover:text-govuk-black transition-colors touch-feedback mr-1"
              aria-label="Speak"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
