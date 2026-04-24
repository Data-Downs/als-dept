"use client";

interface GateOption {
  value: string;
  label: string;
  consequence?: string;
  routingEffect?: {
    enableServices?: string[];
    skipServices?: string[];
    setFacts?: Record<string, string>;
  };
}

interface GateDefinition {
  id: string;
  question: string;
  helpText?: string;
  sensitive?: boolean;
  options: GateOption[];
}

interface DecisionGateCardProps {
  gate: {
    gateId: string;
    definition: GateDefinition;
  };
  selectedValue?: string;
  onSelect: (gateId: string, value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function DecisionGateCard({
  gate,
  selectedValue,
  onSelect,
  onSubmit,
  disabled,
}: DecisionGateCardProps) {
  const { definition } = gate;
  const selectedOption = definition.options.find(
    (o) => o.value === selectedValue,
  );

  return (
    <div className="my-3 rounded-2xl bg-white shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1d70b8"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span className="text-sm font-bold text-govuk-blue">
            {definition.question}
          </span>
        </div>
        {definition.helpText && (
          <p className="text-sm text-govuk-dark-grey mt-2 ml-[38px]">
            {definition.helpText}
          </p>
        )}
      </div>

      {/* Options */}
      <div className="px-5 py-4 space-y-2.5">
        {definition.options.map((option) => {
          const isSelected = selectedValue === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onSelect(gate.gateId, option.value)}
              disabled={disabled}
              className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                isSelected
                  ? "bg-govuk-blue text-white shadow-sm"
                  : "bg-gray-50 text-govuk-black hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isSelected && (
                  <svg
                    className="shrink-0"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span>{option.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Consequence feedback + confirm */}
      {selectedOption && (
        <div className="px-5 pb-5 space-y-3">
          {selectedOption.consequence && (
            <p className="text-sm text-govuk-dark-grey ml-1">
              {selectedOption.consequence}
            </p>
          )}
          <button
            onClick={onSubmit}
            disabled={disabled}
            className="w-full py-3 rounded-xl text-sm font-bold text-white bg-govuk-blue hover:bg-[#003078] transition-colors disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
