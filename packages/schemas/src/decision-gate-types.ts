/**
 * Decision Gates — structured routing questions at the boundary
 * between probabilistic (LLM) and deterministic (state machine) layers.
 *
 * Gates are data-defined, LLM-signalled. The LLM decides *when* to
 * surface a gate. The data defines *what* the options are. The system
 * enforces *what happens next*.
 */

export interface DecisionGateRoutingEffect {
  /** Services to make available in the plan */
  enableServices?: string[];
  /** Services to remove from the plan */
  skipServices?: string[];
  /** Facts to inject into the orchestrator context */
  setFacts?: Record<string, string>;
}

export interface DecisionGateOption {
  /** Machine value for this option */
  value: string;
  /** Human-readable label shown on the button */
  label: string;
  /** Feedback text shown after selection */
  consequence?: string;
  /** Deterministic routing effects applied when this option is chosen */
  routingEffect?: DecisionGateRoutingEffect;
}

export interface DecisionGateDefinition {
  /** Unique gate identifier (e.g. "bereavement-death-registered") */
  id: string;
  /** The question presented to the citizen */
  question: string;
  /** Optional explanatory text shown below the question */
  helpText?: string;
  /** Adjusts styling for sensitive contexts (e.g. bereavement) */
  sensitive?: boolean;
  /** Available options with routing effects */
  options: DecisionGateOption[];
  /** Which life event or service this gate belongs to */
  context?: {
    lifeEventId?: string;
    serviceId?: string;
  };
}

export interface DecisionGateRequest {
  /** The gate ID being presented */
  gateId: string;
  /** Full gate definition for rendering */
  definition: DecisionGateDefinition;
}

export interface DecisionGateAnswer {
  /** The gate that was answered */
  gateId: string;
  /** The value the citizen selected */
  selectedValue: string;
  /** The routing effect to apply (resolved from the definition) */
  routingEffect?: DecisionGateRoutingEffect;
}

export interface DecisionGateFile {
  /** The life event or service this file is for */
  lifeEventId?: string;
  serviceId?: string;
  /** Gate definitions */
  gates: DecisionGateDefinition[];
}
