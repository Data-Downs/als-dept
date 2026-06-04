"use client";

import { useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "@/lib/store";
import HandoffNotice from "./handoff/HandoffNotice";
import { TaskCard } from "./TaskCard";
import { TaskSummaryCard } from "./TaskSummaryCard";
import { TaskReceiptCard } from "./TaskReceiptCard";
import { ConsentPanel } from "./ConsentCard";
import { ConsentSummaryCard } from "./ConsentSummaryCard";
import { DecisionGateCard } from "./DecisionGateCard";
import { StateProgressTracker } from "./StateProgressTracker";
import { ServiceStepCard, SERVICE_STEP_DATA } from "./ServiceStepCard";
import { JourneyCompleteCard } from "./JourneyCompleteCard";
import { CardHost } from "./cards/CardHost";
import { RelatedServicesCard } from "./RelatedServicesCard";
import {
  getAllTerminalStateIds,
  TERMINAL_STATE_CONFIG,
  resolveTerminalConfig,
} from "@als/schemas";
import { QuickReplies } from "./QuickReplies";
import { PipelineTraceBar } from "./PipelineTraceBar";
import { PlanCardsInChat } from "./PlanCardsInChat";
import { RegisterBirthCard } from "./RegisterBirthCard";
import OutcomeCard from "./OutcomeCard";
import { AgentConsentNotice } from "./AgentConsentNotice";

const TERMINAL_STATES = getAllTerminalStateIds();

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 px-4 py-2">
      <div className="bg-white shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 bg-govuk-mid-grey rounded-full animate-bounce-dot"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatView() {
  const conversationHistory = useAppStore((s) => s.conversationHistory);
  const isLoading = useAppStore((s) => s.isLoading);
  const agent = useAppStore((s) => s.agent);
  const activeHandoff = useAppStore((s) => s.activeHandoff);
  const ucState = useAppStore((s) => s.ucState);
  const ucStateHistory = useAppStore((s) => s.ucStateHistory);
  const pendingConsent = useAppStore((s) => s.pendingConsent);
  const consentDecisions = useAppStore((s) => s.consentDecisions);
  const consentSubmitted = useAppStore((s) => s.consentSubmitted);
  const lastResponseTasks = useAppStore((s) => s.lastResponseTasks);
  const taskCompletions = useAppStore((s) => s.taskCompletions);
  const tasksSubmitted = useAppStore((s) => s.tasksSubmitted);
  const currentService = useAppStore((s) => s.currentService);
  const serviceName = useAppStore((s) => s.serviceName);
  const interactionType = useAppStore((s) => s.interactionType);
  const lastPipelineTrace = useAppStore((s) => s.lastPipelineTrace);
  const pendingCards = useAppStore((s) => s.pendingCards);
  const cardsSubmitted = useAppStore((s) => s.cardsSubmitted);
  const pendingGates = useAppStore((s) => s.pendingGates);
  const gateDecisions = useAppStore((s) => s.gateDecisions);
  const gateSubmitted = useAppStore((s) => s.gateSubmitted);
  const pendingOutcomes = useAppStore((s) => s.pendingOutcomes);
  const lastAssistantRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Derived consent state
  const hasRequiredDenials = pendingConsent
    .filter((g) => g.required)
    .some((g) => consentDecisions[g.id] === "denied");

  // Derived task state
  const allTasksCompleted =
    lastResponseTasks.length > 0 &&
    lastResponseTasks.every((t) => taskCompletions[t.id] !== undefined);

  // Derived consent state — all grants have a decision
  const allConsentsDecided =
    pendingConsent.length > 0 &&
    pendingConsent.every((g) => consentDecisions[g.id] !== undefined);

  // Max agent: auto-submit tasks without showing the confirmation summary
  const isMaxAgent = agent === "max";
  const autoSubmitTriggered = useRef(false);
  useEffect(() => {
    if (isMaxAgent && allTasksCompleted && !tasksSubmitted && !isLoading && !autoSubmitTriggered.current) {
      autoSubmitTriggered.current = true;
      useAppStore.getState().submitTasks();
    }
    if (!allTasksCompleted) {
      autoSubmitTriggered.current = false;
    }
  }, [isMaxAgent, allTasksCompleted, tasksSubmitted, isLoading]);

  // Whether to show task cards (after the last assistant message)
  // Gates suppress tasks — when a gate is pending, the gate takes precedence
  const showTasks =
    !isLoading && lastResponseTasks.length > 0 && !tasksSubmitted &&
    (pendingGates.length === 0 || gateSubmitted);
  // Whether to show dynamic form cards
  const showCards = !isLoading && pendingCards.length > 0 && !cardsSubmitted;
  // Whether to show decision gates (after cards are done)
  const showGates =
    !isLoading &&
    pendingGates.length > 0 &&
    !gateSubmitted &&
    (pendingCards.length === 0 || cardsSubmitted);
  // Whether to show consent cards (after tasks/cards/gates are done or when none exist)
  const showConsent =
    !isLoading &&
    pendingConsent.length > 0 &&
    !consentSubmitted &&
    (lastResponseTasks.length === 0 || tasksSubmitted) &&
    (pendingCards.length === 0 || cardsSubmitted);

  // Scroll to the top of the last assistant message when new content arrives.
  // Uses requestAnimationFrame to wait for the browser to paint the new content
  // so the element's offsetTop is accurate.
  const scrollToLastAssistant = () => {
    requestAnimationFrame(() => {
      const el = lastAssistantRef.current;
      const container = chatScrollRef.current;
      if (el && container) {
        container.scrollTo({
          top: el.offsetTop - container.offsetTop,
          behavior: "smooth",
        });
      }
    });
  };

  // Scroll to bottom to reveal cards (consent, task summary, etc.)
  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  useEffect(() => {
    if (isLoading) {
      // While loading, scroll to show the user message + typing indicator
      scrollToEnd();
    } else if (conversationHistory.length > 0) {
      // When response arrives, scroll to the top of the assistant's response
      scrollToLastAssistant();
    }
  }, [
    conversationHistory,
    isLoading,
    activeHandoff,
    ucState,
    showTasks,
    showCards,
    showConsent,
  ]);

  useEffect(() => {
    if (allTasksCompleted && !tasksSubmitted) {
      scrollToEnd();
    }
  }, [allTasksCompleted, tasksSubmitted]);

  useEffect(() => {
    if (allConsentsDecided && !consentSubmitted) {
      scrollToEnd();
    }
  }, [allConsentsDecided, consentSubmitted]);

  // Find the index of the last assistant message (for scroll ref)
  const lastAssistantIdx = conversationHistory.reduce(
    (acc, msg, idx) => (msg.role === "assistant" ? idx : acc),
    -1,
  );

  // Show quick replies when the last message is from the assistant and nothing
  // else is blocking (no tasks, cards, consent, loading, or terminal state)
  const lastMsg = conversationHistory[conversationHistory.length - 1];
  const showQuickReplies =
    !isLoading &&
    lastMsg?.role === "assistant" &&
    typeof lastMsg.content === "string" &&
    !showTasks &&
    !showCards &&
    !showGates &&
    !showConsent &&
    !(ucState && TERMINAL_STATES.has(ucState));

  return (
    <div className="flex flex-col h-full">
      {/* State Progress Tracker — shown when in a single-service UC journey */}
      {ucState && !useAppStore.getState().lifeEventMode && (
        <StateProgressTracker
          currentState={ucState}
          stateHistory={ucStateHistory}
          service={currentService}
          interactionType={interactionType ?? undefined}
        />
      )}

      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 pb-4 space-y-3"
        role="log"
        aria-live="polite"
      >
        {/* Empty state */}
        {conversationHistory.length === 0 && !isLoading && (
          <div className="text-center text-govuk-dark-grey py-12">
            <AgentConsentNotice />
            <svg
              className="mx-auto mb-3 opacity-40"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm">
              {serviceName
                ? `Ask about ${serviceName} to get started.`
                : "Type a message below to start a conversation."}
            </p>
            <p className="text-xs text-govuk-mid-grey mt-2">
              Powered by GOV.UK data
            </p>
          </div>
        )}

        {/* Message bubbles */}
        {conversationHistory.map((msg, idx) => {
          if (typeof msg.content !== "string") return null;

          const isUser = msg.role === "user";
          const isLastAssistant = idx === lastAssistantIdx;
          const RECEIPT_PREFIX = "[TASK_RECEIPT]\n";
          const isTaskReceipt =
            isUser && msg.content.startsWith(RECEIPT_PREFIX);

          if (isTaskReceipt) {
            return (
              <div key={idx}>
                <TaskReceiptCard
                  content={msg.content.slice(RECEIPT_PREFIX.length)}
                />
              </div>
            );
          }

          // Detect special markers in assistant messages
          const hasPlanCards =
            !isUser &&
            typeof msg.content === "string" &&
            msg.content.includes("[PLAN_CARDS]");
          const hasRegisterCard =
            !isUser &&
            typeof msg.content === "string" &&
            msg.content.includes("[REGISTER_BIRTH_CARD]");
          const hasApplicationReceipt =
            !isUser &&
            typeof msg.content === "string" &&
            msg.content.includes("[APPLICATION_RECEIPT]");

          if (hasPlanCards) {
            const [beforeMarker] = (msg.content as string).split(
              "[PLAN_CARDS]",
            );
            return (
              <div
                key={idx}
                ref={isLastAssistant ? lastAssistantRef : undefined}
              >
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed text-govuk-black prose prose-sm prose-neutral max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{beforeMarker.trim()}</ReactMarkdown>
                  </div>
                </div>
                <div>
                  <PlanCardsInChat />
                </div>
              </div>
            );
          }

          if (hasRegisterCard) {
            const [beforeMarker] = (msg.content as string).split(
              "[REGISTER_BIRTH_CARD]",
            );
            return (
              <div
                key={idx}
                ref={isLastAssistant ? lastAssistantRef : undefined}
              >
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed text-govuk-black prose prose-sm prose-neutral max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{beforeMarker.trim()}</ReactMarkdown>
                  </div>
                </div>
                <RegisterBirthCard />
              </div>
            );
          }

          if (hasApplicationReceipt) {
            const [beforeMarker] = (msg.content as string).split(
              "[APPLICATION_RECEIPT]",
            );
            return (
              <div
                key={idx}
                ref={isLastAssistant ? lastAssistantRef : undefined}
              >
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed text-govuk-black prose prose-sm prose-neutral max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{beforeMarker.trim()}</ReactMarkdown>
                  </div>
                </div>
                <TaskReceiptCard
                  content="Application submitted — awaiting confirmation&#10;&#10;Your Tax-Free Childcare application has been submitted to HMRC. You'll receive confirmation within 5 working days. The agent is monitoring this for you."
                />
              </div>
            );
          }

          // Check for [SERVICE:id] or [MENTION:id] markers in assistant messages
          const hasServiceMarkers =
            !isUser &&
            typeof msg.content === "string" &&
            /\[(SERVICE|MENTION):[^\]]+\]/.test(msg.content);

          if (hasServiceMarkers) {
            // Split message on markers and interleave text + cards
            const parts = (msg.content as string).split(
              /(\[(?:SERVICE|MENTION):[^\]]+\])/g,
            );
            return (
              <div
                key={idx}
                ref={isLastAssistant ? lastAssistantRef : undefined}
              >
                {parts.map((part, partIdx) => {
                  const serviceMatch = part.match(
                    /\[(SERVICE|MENTION):([^\]]+)\]/,
                  );
                  if (serviceMatch) {
                    const markerType = serviceMatch[1]; // "SERVICE" or "MENTION"
                    const svcId = serviceMatch[2];
                    const svcData =
                      SERVICE_STEP_DATA[svcId];
                    if (svcData) {
                      return (
                        <div key={partIdx} className="max-w-[85%]">
                          <ServiceStepCard
                            serviceId={svcId}
                            name={svcData.name}
                            dept={svcData.dept}
                            description={svcData.description}
                            urgent={svcData.urgent}
                            variant={markerType === "MENTION" ? "mention" : "step"}
                          />
                        </div>
                      );
                    }
                    return null;
                  }
                  const trimmed = part.trim();
                  if (!trimmed) return null;
                  return (
                    <div key={partIdx} className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed text-govuk-black prose prose-sm prose-neutral max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {trimmed}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={idx} ref={isLastAssistant ? lastAssistantRef : undefined}>
              <div
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? "bg-govuk-blue text-white rounded-br-sm whitespace-pre-wrap"
                      : "text-govuk-black prose prose-sm prose-neutral max-w-none"
                  }`}
                >
                  {isUser ? (
                    msg.content
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Pipeline trace bar — shown below the last assistant message */}
        {!isLoading && lastPipelineTrace && (
          <PipelineTraceBar trace={lastPipelineTrace} />
        )}

        {/* Quick reply buttons — detected from bulleted choices in assistant message */}
        {showQuickReplies && (
          <QuickReplies
            messageText={lastMsg.content as string}
            onSelect={(reply) => useAppStore.getState().sendMessage(reply)}
            disabled={isLoading}
          />
        )}

        {/* Dynamic form cards — rendered when chat API returns cardRequests */}
        {showCards && (
          <div className="mt-1">
            <CardHost
              cardRequests={pendingCards}
              onAllSubmitted={(msg) =>
                useAppStore.getState().submitCardsSummary(msg)
              }
              disabled={isLoading}
            />
          </div>
        )}

        {/* Decision gates — tappable routing questions */}
        {showGates && (
          <div className="mt-1">
            {pendingGates.map((gate) => (
              <DecisionGateCard
                key={gate.gateId}
                gate={gate}
                selectedValue={gateDecisions[gate.gateId]}
                onSelect={(id, value) => {
                  useAppStore.getState().setGateDecision(id, value);
                }}
                onSubmit={() => useAppStore.getState().submitGateDecision()}
                disabled={isLoading}
              />
            ))}
          </div>
        )}

        {/* Task cards — rendered outside the message loop for reliability */}
        {showTasks && (
          <div className="mt-1">
            {lastResponseTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                completion={taskCompletions[task.id]}
                onComplete={(id, message) => {
                  useAppStore.getState().setTaskCompletion(id, message);
                }}
                onReset={(id) => {
                  useAppStore.getState().clearTaskCompletion(id);
                }}
                disabled={isLoading}
              />
            ))}

            {/* Summary card appears when all tasks are completed (not for Max — he auto-submits) */}
            {allTasksCompleted && !isMaxAgent && (
              <TaskSummaryCard
                tasks={lastResponseTasks}
                completions={taskCompletions}
                onChangeTask={(id) => {
                  useAppStore.getState().clearTaskCompletion(id);
                }}
                onSubmit={() => useAppStore.getState().submitTasks()}
                isSubmitting={isLoading}
              />
            )}
          </div>
        )}

        {/* Consent panel — single grouped card for all grants */}
        {showConsent && (
          <div className="mt-1">
            <ConsentPanel
              grants={pendingConsent}
              decisions={consentDecisions}
              onDecision={(id, decision) => {
                useAppStore.getState().setConsentDecision(id, decision);
              }}
              disabled={isLoading}
              interactionType={interactionType ?? undefined}
            />

            {/* Summary card appears when all consents are decided */}
            {allConsentsDecided && (
              <ConsentSummaryCard
                grants={pendingConsent}
                decisions={consentDecisions}
                onSubmit={() => useAppStore.getState().submitConsent()}
                onChangeDecision={(id) => {
                  useAppStore.getState().clearConsentDecision(id);
                }}
                hasRequiredDenials={hasRequiredDenials}
                isSubmitting={isLoading}
                interactionType={interactionType ?? undefined}
                serviceId={currentService ?? undefined}
                department={serviceName ?? undefined}
              />
            )}
          </div>
        )}

        {/* Handoff notice */}
        {activeHandoff && activeHandoff.triggered && (
          <div className="mt-1">
            <HandoffNotice
              urgency={
                (activeHandoff.urgency as
                  | "routine"
                  | "priority"
                  | "urgent"
                  | "safeguarding") || "routine"
              }
              reason={
                activeHandoff.description ||
                "The agent has determined you should speak to a person."
              }
              department={
                (activeHandoff.routing?.department as string) ||
                "Government service"
              }
              phone={
                (activeHandoff.routing?.suggestedQueue as string) || undefined
              }
              onDismiss={() => useAppStore.setState({ activeHandoff: null })}
              interactionType={interactionType ?? undefined}
            />
          </div>
        )}

        {/* Journey outcomes — tangible results (payments, credentials, documents) */}
        {!isLoading && pendingOutcomes.length > 0 && (
          <div className="mt-1 px-1">
            {pendingOutcomes.map((outcome) => (
              <OutcomeCard key={outcome.id} outcome={outcome} />
            ))}
          </div>
        )}

        {/* Journey complete card — shown when state is terminal */}
        {!isLoading && ucState && TERMINAL_STATES.has(ucState) && (
          <div className="mt-1">
            <JourneyCompleteCard
              state={ucState}
              serviceName={serviceName ?? undefined}
              serviceId={currentService ?? undefined}
              interactionType={interactionType ?? undefined}
              slim={pendingOutcomes.length > 0}
            />
            {/* Related services — only for success terminals */}
            {currentService &&
              resolveTerminalConfig(ucState, interactionType).isSuccess && (
                <RelatedServicesCard serviceId={currentService} />
              )}
          </div>
        )}

        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
