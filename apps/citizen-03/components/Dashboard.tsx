"use client";

import { useAppStore, getConversations } from "@/lib/store";

export function Dashboard() {
  const persona = useAppStore((s) => s.persona);
  const personaData = useAppStore((s) => s.personaData);
  const startNewConversation = useAppStore((s) => s.startNewConversation);
  const loadConversation = useAppStore((s) => s.loadConversation);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const conversations = persona ? getConversations(persona) : [];
  const name = personaData?.name ||
    personaData?.personaName ||
    (personaData?.primaryContact
      ? `${personaData.primaryContact.firstName} ${personaData.primaryContact.lastName}`
      : persona) || "User";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-govuk-blue text-white px-4 py-4 pt-14 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Hello, {name.split(" ")[0]}</h1>
            <p className="text-xs text-blue-100 mt-0.5">
              How can I help you today?
            </p>
          </div>
          <button
            onClick={() => navigateTo("persona-picker")}
            className="text-xs text-blue-200 underline"
          >
            Switch
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {/* New conversation CTA */}
        <button
          onClick={startNewConversation}
          className="w-full p-4 bg-white rounded-card shadow-sm border-2 border-govuk-blue text-left hover:shadow-md transition-shadow touch-feedback mb-4"
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
              "My partner has recently passed away. What do I need to do?",
              "I've just lost my job. What benefits am I entitled to?",
              "I'm expecting a baby. What services should I know about?",
              "My driving licence is expiring. How do I renew it?",
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => {
                  startNewConversation();
                  // Small delay to let the view switch, then send
                  setTimeout(() => useAppStore.getState().sendMessage(prompt), 100);
                }}
                className="w-full text-left p-3 bg-white rounded-lg border border-gray-100 text-sm text-govuk-black hover:bg-gray-50 transition-colors"
              >
                {prompt}
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
                  className="w-full text-left p-3 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-sm text-govuk-black truncate">
                    {conv.title}
                  </div>
                  <div className="text-xs text-govuk-mid-grey mt-0.5">
                    {conv.messages.length} messages
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
