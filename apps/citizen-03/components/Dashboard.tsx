"use client";

import { useAppStore, getConversations } from "@/lib/store";

export function Dashboard() {
  const persona = useAppStore((s) => s.persona);
  const personaData = useAppStore((s) => s.personaData);
  const startNewConversation = useAppStore((s) => s.startNewConversation);
  const loadConversation = useAppStore((s) => s.loadConversation);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const toggleSettings = useAppStore((s) => s.toggleSettings);

  const conversations = persona ? getConversations(persona) : [];
  const name = personaData?.name ||
    personaData?.personaName ||
    (personaData?.primaryContact
      ? `${personaData.primaryContact.firstName} ${personaData.primaryContact.lastName}`
      : persona) || "User";

  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-govuk-blue text-white px-4 py-4 pt-14 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSettings}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold hover:bg-white/30 transition-colors"
            >
              {initials}
            </button>
            <div>
              <h1 className="text-lg font-bold">Hello, {name.split(" ")[0]}</h1>
              <p className="text-xs text-blue-100 mt-0.5">
                How can I help you today?
              </p>
            </div>
          </div>
          <button
            onClick={() => navigateTo("persona-picker")}
            className="text-xs text-blue-200 underline hover:text-white transition-colors"
          >
            Switch
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {/* New conversation CTA */}
        <button
          onClick={startNewConversation}
          className="w-full p-4 bg-white rounded-card shadow-sm border-2 border-govuk-blue text-left hover:shadow-md transition-all active:scale-[0.99] mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-govuk-blue flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="font-semibold text-govuk-blue">Start a new conversation</div>
              <div className="text-xs text-govuk-dark-grey mt-0.5">
                Ask about any government service, life event, or benefit
              </div>
            </div>
          </div>
        </button>

        {/* Suggested prompts */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-govuk-dark-grey uppercase tracking-wider mb-2">
            Try asking about...
          </h2>
          <div className="space-y-2">
            {[
              { text: "My partner has recently passed away. What do I need to do?", icon: "💜" },
              { text: "I've just lost my job. What benefits am I entitled to?", icon: "💼" },
              { text: "I'm expecting a baby. What services should I know about?", icon: "👶" },
              { text: "My driving licence is expiring. How do I renew it?", icon: "🚗" },
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => {
                  startNewConversation();
                  setTimeout(() => useAppStore.getState().sendMessage(prompt.text), 100);
                }}
                className="w-full text-left p-3 bg-white rounded-lg border border-gray-100 text-sm text-govuk-black hover:bg-gray-50 hover:border-gray-200 transition-all active:scale-[0.99]"
              >
                <span className="mr-2">{prompt.icon}</span>
                {prompt.text}
              </button>
            ))}
          </div>
        </div>

        {/* Previous conversations */}
        {conversations.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-govuk-dark-grey uppercase tracking-wider mb-2">
              Recent conversations
            </h2>
            <div className="space-y-2">
              {conversations.slice(0, 5).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className="w-full text-left p-3 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-govuk-black truncate flex-1">
                      {conv.title}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" className="text-govuk-mid-grey shrink-0 ml-2">
                      <path d="M5 2.5l4.5 4.5L5 11.5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="text-xs text-govuk-mid-grey mt-0.5">
                    {conv.messages.length} messages · {new Date(conv.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
