"use client";

import { useRef, useState, useCallback } from "react";
import type { PersonaData } from "@/lib/types";
import { DEMO_TODAY } from "@/lib/types";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const diff = target.getTime() - DEMO_TODAY.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDuration(days: number): string {
  if (days < 0) return "Expired";
  if (days > 60) {
    const months = Math.round(days / 30);
    return `${months} months`;
  }
  return `${days} days`;
}

interface HeroCard {
  id: string;
  title: string;
  subtitle: string;
  stats: Array<{
    label: string;
    value: string;
    urgency?: "urgent" | "warning" | "ok";
    action?: string;
  }>;
  service: string;
  registration?: string;
}

export function buildHeroCards(data: PersonaData): HeroCard[] {
  const cards: HeroCard[] = [];

  // Vehicle cards
  if (data.vehicles) {
    for (const v of data.vehicles) {
      const motDays = v.motExpiry ? daysUntil(v.motExpiry) : null;
      const taxDays = v.taxExpiry ? daysUntil(v.taxExpiry) : null;
      const stats: HeroCard["stats"] = [];
      if (motDays !== null) {
        stats.push({
          label: "MOT",
          value: motDays < 0 ? "Expired" : formatDuration(motDays),
          urgency: motDays < 0 ? "urgent" : motDays < 30 ? "warning" : "ok",
        });
      }
      if (taxDays !== null) {
        const needsRenew = taxDays >= 0 && taxDays < 30;
        stats.push({
          label: "Tax",
          value: taxDays < 0 ? "Expired" : formatDuration(taxDays),
          urgency: taxDays < 0 ? "urgent" : taxDays < 30 ? "warning" : "ok",
          action: needsRenew ? "Renew" : undefined,
        });
      }
      cards.push({
        id: `vehicle-${v.registrationNumber}`,
        title: `${v.make}`,
        subtitle: `${v.model}`,
        registration: v.registrationNumber,
        stats,
        service: "driving",
      });
    }
  }

  // Benefits / pension cards
  const financials = data.financials as Record<string, unknown> | undefined;
  if (financials?.statePension) {
    const sp = financials.statePension as Record<string, unknown>;
    cards.push({
      id: "state-pension",
      title: "State Pension",
      subtitle: (sp.type as string) || "State Pension",
      stats: [
        {
          label: "Weekly",
          value: sp.weeklyAmount ? `£${sp.weeklyAmount}` : "Active",
          urgency: "ok",
        },
      ],
      service: "benefits",
    });
  }
  if (data.benefits?.currentlyReceiving) {
    for (const b of data.benefits.currentlyReceiving) {
      cards.push({
        id: `benefit-${b.type}`,
        title: b.type,
        subtitle: `£${b.amount}/${b.frequency}`,
        stats: [{ label: "Amount", value: `£${b.amount}`, urgency: "ok" }],
        service: "benefits",
      });
    }
  }

  // Workplace pension — detect from employment data (e.g. teacher)
  const employment = data.employment as Record<string, unknown> | undefined;
  if (employment) {
    const entries = Object.values(employment).filter(
      (v) =>
        v &&
        typeof v === "object" &&
        "jobTitle" in (v as Record<string, unknown>),
    ) as Array<Record<string, unknown>>;
    for (const entry of entries) {
      const jobTitle = String(entry.jobTitle ?? "").toLowerCase();
      const employer = String(entry.employer ?? "");
      if (jobTitle.includes("teacher")) {
        cards.push({
          id: "teachers-pension",
          title: "Teachers' Pension",
          subtitle: `Enrolled via ${employer}`,
          stats: [
            { label: "Status", value: "Employer contributing", urgency: "ok" },
          ],
          service: "benefits",
        });
        break;
      }
    }
  }

  // Pregnancy card
  if (data.pregnancy?.dueDate) {
    const days = daysUntil(data.pregnancy.dueDate);
    const weeks = Math.floor(days / 7);
    cards.push({
      id: "pregnancy",
      title: "Baby due",
      subtitle: data.pregnancy.hospital || "",
      stats: [
        {
          label: "Due in",
          value: weeks > 0 ? `${weeks} weeks` : `${days} days`,
          urgency: days < 60 ? "warning" : "ok",
        },
      ],
      service: "family",
    });
  }

  // Children cards
  if (data.children && data.children.length > 0 && !data.pregnancy) {
    cards.push({
      id: "children",
      title: `${data.children.length} ${data.children.length === 1 ? "child" : "children"}`,
      subtitle: data.children.map((c) => c.firstName).join(", "),
      stats: [],
      service: "family",
    });
  }

  return cards;
}

interface HeroCarouselProps {
  personaData: PersonaData;
  filterService?: string;
  onCardTap?: (service: string) => void;
}

export function HeroCarousel({
  personaData,
  filterService,
  onCardTap,
}: HeroCarouselProps) {
  const allCards = buildHeroCards(personaData);
  const cards = filterService
    ? allCards.filter((c) => c.service === filterService)
    : allCards;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = el.firstElementChild?.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(idx, cards.length - 1)));
  }, [cards.length]);

  if (cards.length === 0) return null;

  return (
    <div className="mb-5">
      {/* Carousel track */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto scroll-snap-x scroll-momentum pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {cards.map((card) =>
          card.registration ? (
            /* Vehicle card — split layout matching GOV.UK design */
            <button
              key={card.id}
              onClick={() => onCardTap?.(card.service)}
              className="min-w-[280px] max-w-[320px] flex-shrink-0 scroll-snap-item bg-white rounded-2xl text-left touch-feedback transition-shadow hover:shadow-md overflow-hidden"
            >
              {/* Top section: make, model, reg plate */}
              <div className="p-4 pb-3">
                <h3 className="font-bold text-govuk-black text-xl leading-tight">
                  {card.title}
                </h3>
                <p className="text-sm text-govuk-dark-grey mt-0.5">
                  {card.subtitle}
                </p>
                {/* UK registration plate */}
                <div className="mt-3 w-full bg-[#F5C332] rounded-xl py-[9px] flex items-center justify-center">
                  <span className="font-plate text-black text-[2.5rem] tracking-[0.01em] leading-none uppercase">
                    {card.registration}
                  </span>
                </div>
              </div>
              {/* Bottom section: stats in two columns with dividers */}
              {card.stats.length > 0 && (
                <div className="border-t border-gray-200 grid grid-cols-2 divide-x divide-gray-200">
                  {card.stats.map((stat, i) => (
                    <div key={i} className="p-3">
                      <p className="text-xs text-govuk-dark-grey">
                        <span className="font-bold text-govuk-black">
                          {stat.label}
                        </span>{" "}
                        {stat.label === "MOT" ? "valid for" : "due in"}
                      </p>
                      <p
                        className={`text-2xl font-bold leading-tight mt-0.5 ${
                          stat.urgency === "urgent"
                            ? "text-govuk-red"
                            : stat.urgency === "warning"
                              ? "text-govuk-black"
                              : "text-govuk-black"
                        }`}
                      >
                        {stat.value}
                      </p>
                      {stat.action && (
                        <span className="inline-block mt-2 bg-govuk-green text-white text-xs font-bold px-3 py-1.5 rounded">
                          {stat.action}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </button>
          ) : (
            /* Generic card — same split layout as vehicle cards */
            <button
              key={card.id}
              onClick={() => onCardTap?.(card.service)}
              className="min-w-[280px] max-w-[320px] flex-shrink-0 scroll-snap-item bg-white rounded-2xl text-left touch-feedback transition-shadow hover:shadow-md overflow-hidden"
            >
              <div className="p-4 pb-3">
                <h3 className="font-bold text-govuk-black text-xl leading-tight">
                  {card.title}
                </h3>
                <p className="text-sm text-govuk-dark-grey mt-0.5">
                  {card.subtitle}
                </p>
              </div>
              {card.stats.length > 0 && (
                <div
                  className={`border-t border-gray-200 grid divide-x divide-gray-200 ${
                    card.stats.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  }`}
                >
                  {card.stats.map((stat, i) => (
                    <div key={i} className="p-3">
                      <p className="text-xs text-govuk-dark-grey">
                        <span className="font-bold text-govuk-black">
                          {stat.label}
                        </span>
                      </p>
                      <p
                        className={`text-2xl font-bold leading-tight mt-0.5 ${
                          stat.urgency === "urgent"
                            ? "text-govuk-red"
                            : stat.urgency === "warning"
                              ? "text-govuk-black"
                              : "text-govuk-black"
                        }`}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </button>
          ),
        )}
      </div>

      {/* Pagination dots */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {cards.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === activeIndex ? "bg-govuk-blue w-4" : "bg-govuk-mid-grey"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
