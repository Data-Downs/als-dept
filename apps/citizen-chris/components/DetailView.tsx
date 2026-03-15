"use client";

import { useAppStore, getConversations } from "@/lib/store";
import type { ServiceType } from "@/lib/types";
import { HeroCarousel, buildHeroCards } from "./dashboard/HeroCarousel";
import { UnifiedTimeline } from "./dashboard/UnifiedTimeline";
import { TopicList } from "./detail/TopicList";
import { ServiceContextCard } from "./detail/ServiceContextCard";
import { ANNA_SUPPORT } from "@/lib/demo-data";

export function DetailView() {
  const personaData = useAppStore((s) => s.personaData);
  const persona = useAppStore((s) => s.persona);
  const currentService = useAppStore((s) => s.currentService);
  const serviceName = useAppStore((s) => s.serviceName);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const startNewConversation = useAppStore((s) => s.startNewConversation);
  const openBottomSheet = useAppStore((s) => s.openBottomSheet);

  if (!personaData || !currentService) return null;

  const conversations = persona
    ? getConversations(persona).filter((c) => c.service === currentService).slice(0, 5)
    : [];

  // Only show the context card when the carousel has no cards for this service
  const hasCarouselCards = buildHeroCards(personaData).some((c) => c.service === currentService);

  // Eligible support items for benefits promo cards
  const eligibleSupport = currentService === "benefits"
    ? ANNA_SUPPORT.filter((s) => s.status === "eligible" || s.status === "check")
    : [];

  const handleAskAbout = (topic: string) => {
    startNewConversation("benefits", topic);
    navigateTo("chat", "benefits", topic);
    setTimeout(() => {
      useAppStore.getState().sendMessage(`Tell me about ${topic}`);
    }, 100);
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-govuk-black mb-4">{serviceName || "Details"}</h2>

      {/* Contextual data card — shown when no carousel cards exist for this service */}
      {!hasCarouselCards && (
        <ServiceContextCard
          service={currentService}
          serviceName={serviceName || currentService}
          personaData={personaData}
        />
      )}

      {/* Hero carousel filtered to this service */}
      <HeroCarousel
        personaData={personaData}
        filterService={currentService}
        onCardTap={() => {
          startNewConversation(currentService, serviceName);
          navigateTo("chat", currentService, serviceName);
        }}
      />

      {/* Eligible support promo cards — benefits only */}
      {eligibleSupport.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-bold text-govuk-dark-grey uppercase tracking-wide mb-3">
            You may be eligible for
          </h3>
          <div className="flex flex-col gap-2">
            {eligibleSupport.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAskAbout(item.name)}
                className="w-full text-left bg-white rounded-card shadow-sm p-4 hover:shadow-md transition-all touch-feedback"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d70b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <strong className="text-sm font-bold text-govuk-black">{item.name}</strong>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        item.status === "eligible"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {item.status === "eligible" ? "Eligible" : "Check"}
                      </span>
                    </div>
                    <p className="text-sm text-govuk-dark-grey mb-1">{item.description}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-bold text-govuk-blue">{item.amount}</span>
                      <span className="text-xs text-govuk-dark-grey">{item.frequency}</span>
                    </div>
                    <span className="text-xs text-govuk-blue font-medium mt-2 inline-block">
                      Find out more →
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA block */}
      <div className="bg-white rounded-card shadow-sm p-4 mb-5">
        <button
          onClick={() => {
            startNewConversation(currentService, serviceName);
            navigateTo("chat", currentService, serviceName);
          }}
          className="w-full py-3 rounded-full font-bold text-sm text-white bg-govuk-blue  transition-colors touch-feedback"
        >
          Ask about {serviceName || currentService}
        </button>
      </div>

      {/* Topic list */}
      <TopicList service={currentService} />

      {/* Service-filtered timeline */}
      <UnifiedTimeline
        personaData={personaData}
        persona={persona}
        filterService={currentService}
        maxItems={4}
        onItemTap={(item) => openBottomSheet("task-detail", item)}
        onSeeAll={() => navigateTo("tasks")}
      />

      {/* Conversations for this service */}
      {conversations.length > 0 && (
        <div className="mb-5">
          <h3 className="text-base font-extrabold text-govuk-black mb-3">Conversations</h3>
          <div className="flex flex-col gap-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  useAppStore.getState().loadConversation(conv.id);
                  navigateTo("chat", conv.service as ServiceType);
                }}
                className="flex items-center gap-3 w-full p-3 bg-white rounded-card shadow-sm hover:shadow-md transition-all text-left touch-feedback"
              >
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{conv.title}</span>
                  <span className="text-xs text-govuk-dark-grey">
                    {new Date(conv.updatedAt).toLocaleDateString("en-GB")} — {conv.messages.length} messages
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
