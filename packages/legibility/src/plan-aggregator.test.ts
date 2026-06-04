import { describe, it, expect } from "vitest";
import { projectPlan, accumulateGateAnswers } from "./plan-aggregator";
import type {
  MemberStateSnapshot,
  PlanContext,
  DecisionGateAnswer,
} from "@als/schemas";
import { EMPTY_PLAN_CONTEXT } from "@als/schemas";

const NOT_STARTED: MemberStateSnapshot = { isTerminal: false, started: false };
const STARTED: MemberStateSnapshot = { isTerminal: false, started: true };
const DONE: MemberStateSnapshot = { isTerminal: true, started: true };

describe("projectPlan", () => {
  it("marks an entry service with no prerequisites as available", () => {
    const { status } = projectPlan(
      { serviceIds: ["a"], edges: [] },
      { a: NOT_STARTED },
    );
    expect(status.a).toBe("available");
  });

  it("locks a service behind an unmet REQUIRES prerequisite", () => {
    const { status } = projectPlan(
      { serviceIds: ["a", "b"], edges: [{ from: "a", to: "b", type: "REQUIRES" }] },
      { a: NOT_STARTED, b: NOT_STARTED },
    );
    expect(status.a).toBe("available");
    expect(status.b).toBe("locked");
  });

  it("unlocks a REQUIRES dependent once its prerequisite completes", () => {
    const { status } = projectPlan(
      { serviceIds: ["a", "b"], edges: [{ from: "a", to: "b", type: "REQUIRES" }] },
      { a: DONE, b: NOT_STARTED },
    );
    expect(status.a).toBe("completed");
    expect(status.b).toBe("available");
  });

  it("a skipped prerequisite also unlocks the dependent", () => {
    const { status } = projectPlan(
      { serviceIds: ["a", "b"], edges: [{ from: "a", to: "b", type: "REQUIRES" }] },
      { a: NOT_STARTED, b: NOT_STARTED },
      { ...EMPTY_PLAN_CONTEXT, skipServices: ["a"] },
    );
    expect(status.a).toBe("skipped");
    expect(status.b).toBe("available");
  });

  it("ENABLES never locks the dependent (soft surfacing only)", () => {
    const { status } = projectPlan(
      { serviceIds: ["a", "b"], edges: [{ from: "a", to: "b", type: "ENABLES" }] },
      { a: NOT_STARTED, b: NOT_STARTED },
    );
    expect(status.b).toBe("available");
  });

  it("a chained REQUIRES stays locked until the whole chain is done", () => {
    const edges = [
      { from: "a", to: "b", type: "REQUIRES" as const },
      { from: "b", to: "c", type: "REQUIRES" as const },
    ];
    const { status } = projectPlan(
      { serviceIds: ["a", "b", "c"], edges },
      { a: DONE, b: NOT_STARTED, c: NOT_STARTED },
    );
    expect(status.b).toBe("available");
    expect(status.c).toBe("locked");
  });

  it("rolls a terminal member up to completed and a started member to in_progress", () => {
    const { status } = projectPlan(
      { serviceIds: ["a", "b"], edges: [] },
      { a: DONE, b: STARTED },
    );
    expect(status.a).toBe("completed");
    expect(status.b).toBe("in_progress");
  });

  it("skips a service flagged by a relevance rule", () => {
    const { status } = projectPlan(
      { serviceIds: ["a"], edges: [] },
      { a: NOT_STARTED },
      EMPTY_PLAN_CONTEXT,
      { a: "Not eligible at your age" },
    );
    expect(status.a).toBe("skipped");
  });

  it("skip never overrides a started service (skip beats enable unless started)", () => {
    const { status } = projectPlan(
      { serviceIds: ["a"], edges: [] },
      { a: STARTED },
      { ...EMPTY_PLAN_CONTEXT, skipServices: ["a"] },
    );
    expect(status.a).toBe("in_progress");
  });

  it("includes gate-enabled services that were not in the original scaffold", () => {
    const { status } = projectPlan(
      { serviceIds: ["a"], edges: [] },
      { a: NOT_STARTED },
      { ...EMPTY_PLAN_CONTEXT, enabledServices: ["x"] },
    );
    expect(status.x).toBe("available");
  });

  it("ignores a dangling REQUIRES edge whose prerequisite is not in the plan", () => {
    const { status } = projectPlan(
      { serviceIds: ["b"], edges: [{ from: "ghost", to: "b", type: "REQUIRES" }] },
      { b: NOT_STARTED },
    );
    expect(status.b).toBe("available");
  });
});

describe("accumulateGateAnswers", () => {
  it("unions enable/skip sets and merges facts last-write-wins", () => {
    const answers: DecisionGateAnswer[] = [
      {
        gateId: "g1",
        selectedValue: "yes",
        routingEffect: {
          enableServices: ["probate"],
          setFacts: { hasWill: "yes" },
        },
      },
      {
        gateId: "g2",
        selectedValue: "no",
        routingEffect: {
          skipServices: ["intestacy"],
          setFacts: { hasWill: "confirmed" },
        },
      },
    ];
    const ctx: PlanContext = accumulateGateAnswers(answers);
    expect(ctx.enabledServices).toEqual(["probate"]);
    expect(ctx.skipServices).toEqual(["intestacy"]);
    expect(ctx.facts.hasWill).toBe("confirmed");
  });

  it("returns an empty context for answers with no routing effects", () => {
    const ctx = accumulateGateAnswers([{ gateId: "g", selectedValue: "x" }]);
    expect(ctx.enabledServices).toEqual([]);
    expect(ctx.skipServices).toEqual([]);
    expect(ctx.facts).toEqual({});
  });
});
