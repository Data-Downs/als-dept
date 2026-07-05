import { NextRequest } from "next/server";
import {
  AnthropicAdapter,
  type AnthropicChatInput,
  type AnthropicChatOutput,
} from "@als/adapters";

/**
 * The agent layer (V1 — the citizen's agent). A bare LLM agent that gets to
 * know the person, builds a profile of what they're responsible for, and — when
 * asked to DO something — reads the service's declared auth and prompts them to
 * sign in (never acting silently). Acting always leaves a receipt.
 */

type Entry = { key: string; label: string };
type Profile = {
  identity: Record<string, unknown>;
  responsibilities: Entry[];
  liabilities: Entry[];
  eligibilities: Entry[];
};

type ServiceAuth = {
  login: "one-login" | "government-gateway";
  identityVerification?: boolean;
};

type Resolves = { list: "liabilities" | "eligibilities"; key: string; label: string };
type PendingAction = {
  serviceId: string;
  label: string;
  dataShared: string[];
  auth: ServiceAuth;
  summary: string;
  resolves?: Resolves;
};

const emptyProfile = (): Profile => ({
  identity: {},
  responsibilities: [],
  liabilities: [],
  eligibilities: [],
});

/**
 * The business-domain services the agent can act on, each carrying its DECLARED
 * auth — the same model as the service graph, scoped to what this demo agent
 * handles. Companies House needs a One Login + a verified identity; HMRC still
 * uses Government Gateway.
 */
const AGENT_SERVICES: Record<
  string,
  { label: string; dataShared: string[]; auth: ServiceAuth; resolves?: Resolves }
> = {
  "companies-house-confirmation-statement": {
    label: "file your confirmation statement with Companies House",
    dataShared: [
      "Company number",
      "Registered office",
      "Director details",
      "Your verified identity",
    ],
    auth: { login: "one-login", identityVerification: true },
    resolves: {
      list: "liabilities",
      key: "confirmation-statement",
      label: "Confirmation statement",
    },
  },
  "hmrc-vat-return": {
    label: "submit your VAT return to HMRC",
    dataShared: ["VAT registration number", "Sales and purchase totals"],
    auth: { login: "government-gateway" },
    resolves: { list: "liabilities", key: "vat-return", label: "VAT return" },
  },
};

const SYSTEM = `You are Dot — the citizen's personal government agent, and their single way in to everything the UK state does. The person never has to know which department handles what, never picks a service, never fills in a form addressed to a bureaucracy. You work all of that out for them and organise government around them. You are calm, capable and quietly warm — never gushing, never sycophantic.

## Discovery
Lead with the person's situation, never with their identity. Get to know them through whatever brought them here: their circumstances, and — as it becomes relevant — roughly their age, where they live, their business, car, home, children, job, pension. Be genuinely curious and brief. Ask ONE thing at a time. Reflect back what you understand in a sentence. Never lecture or list government services or departments. Only ask something when the answer visibly helps with the thing they came for.

Run on PROGRESSIVE DISCLOSURE — always make richer detail optional, never demanded:
- You ask what to CALL them, not their legal name. A first name is plenty for now; their full legal name can wait until a service actually needs it.
- When you ask their age, mention they can give their date of birth if they'd prefer; it's optional.
- At a natural moment, ask if they happen to know their National Insurance number — optional.

Record everything concrete with the remember tool: set identity fields (name, fullName, dateOfBirth, age, location, nationalInsuranceNumber, job, company…) and record what you learn across three lists:
- **responsibilities** — ongoing duties or things they hold: a limited company, a car, a home, a child.
- **liabilities** — what they owe or are on the hook for as a consequence: corporation tax, a confirmation statement due, VAT, self-assessment, vehicle tax.
- **eligibilities** — what they could claim or access but may not have taken up: tax-free childcare, marriage allowance, a state pension forecast.

The quiet value is joining these up: when someone tells you they run a limited company, you already know they are liable for a confirmation statement and corporation tax — record those liabilities without being asked, and mention them naturally. Never lecture or dump a list; surface one relevant thing at a time.

Every entry carries a stable \`key\` and a short \`label\`. Record a thing ONCE under a lasting key (e.g. key "limited-company", "confirmation-statement"), then, as you learn more, UPDATE the same key with a richer label — never create a second entry for the same thing. Keep labels short: "Director of Unusually Ltd", "Confirmation statement due", not a sentence.

## Acting
You also have an act tool. When the citizen clearly asks you to actually DO something with government — file a confirmation statement, submit a VAT return — call act with the matching serviceId. You NEVER do it silently: acting requires them to sign in, and calling act prompts them for the correct login. As you call act, tell them plainly, in one line, what you're about to do and that you'll need them to sign in.

Available services:
- companies-house-confirmation-statement — file the company's confirmation statement (Companies House). Record the matching liability under the key "confirmation-statement".
- hmrc-vat-return — submit a VAT return (HMRC). Record the matching liability under the key "vat-return".

## Offering to act
When you discover a liability you can actually discharge with one of the services above — a confirmation statement (they're a company director) or a VAT return (their business is VAT-registered) — you may OFFER, ONCE and gently, to take it off their plate. Frame it as a real question that makes "I'm on top of it myself" an easy, unembarrassing answer: e.g. "Would you like me to file that for you, or are you handling it yourself?" Make at most one offer, then let it go — never chase or repeat it. Only call act once they clearly say yes. For anything you can't act on (corporation tax, an eligibility like tax-free childcare), note it plainly but do not offer to do it.

Open in two short sentences: who you are, and the promise that they'll never have to work out which department does what — that's your job. Then ask, openly, what's brought them here today. Do NOT ask their name yet. Once they've told you why they've come, warmly ask what you should call them.`;

const TOOLS = [
  {
    name: "remember",
    description:
      "Record something you've learned about the person into their profile.",
    input_schema: {
      type: "object",
      properties: {
        identity: {
          type: "object",
          description:
            "Identity fields to merge, e.g. { name, fullName, age, dateOfBirth, location, nationalInsuranceNumber, job }.",
          additionalProperties: true,
        },
        responsibilities: {
          type: "array",
          description:
            "Ongoing duties or things the person holds (a company, a car, a home, a child). Use a stable key per thing and update its label as you learn more — never duplicate.",
          items: {
            type: "object",
            properties: {
              key: {
                type: "string",
                description:
                  "Stable slug for this responsibility, e.g. 'limited-company', 'car', 'mortgage'.",
              },
              label: {
                type: "string",
                description: "Short display label, e.g. 'Director of Unusually Ltd'.",
              },
            },
            required: ["key", "label"],
          },
        },
        liabilities: {
          type: "array",
          description:
            "What the person owes or is on the hook for (corporation tax, a confirmation statement due, VAT, self-assessment). Infer these from their responsibilities. Stable key per thing; update, never duplicate.",
          items: {
            type: "object",
            properties: {
              key: {
                type: "string",
                description:
                  "Stable slug, e.g. 'confirmation-statement', 'corporation-tax', 'self-assessment'.",
              },
              label: {
                type: "string",
                description: "Short display label, e.g. 'Confirmation statement due'.",
              },
            },
            required: ["key", "label"],
          },
        },
        eligibilities: {
          type: "array",
          description:
            "What the person could claim or access but may not have taken up (tax-free childcare, marriage allowance, a pension forecast). Stable key per thing; update, never duplicate.",
          items: {
            type: "object",
            properties: {
              key: {
                type: "string",
                description:
                  "Stable slug, e.g. 'tax-free-childcare', 'marriage-allowance'.",
              },
              label: {
                type: "string",
                description: "Short display label, e.g. 'Tax-free childcare'.",
              },
            },
            required: ["key", "label"],
          },
        },
      },
    },
  },
  {
    name: "act",
    description:
      "Perform a government service on the citizen's behalf. This will prompt them to sign in — you cannot do it silently.",
    input_schema: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          enum: [
            "companies-house-confirmation-statement",
            "hmrc-vat-return",
          ],
          description: "The service to perform.",
        },
        summary: {
          type: "string",
          description:
            "One short line describing what you're about to do, e.g. 'file your confirmation statement'.",
        },
      },
      required: ["serviceId"],
    },
  },
];

function mergeProfile(profile: Profile, patch: Record<string, unknown>): Profile {
  const p: Profile = {
    ...emptyProfile(),
    ...profile,
    identity: { ...emptyProfile().identity, ...profile?.identity },
    responsibilities: (profile?.responsibilities ?? []).map((r) => ({ ...r })),
    liabilities: (profile?.liabilities ?? []).map((r) => ({ ...r })),
    eligibilities: (profile?.eligibilities ?? []).map((r) => ({ ...r })),
  };
  if (patch.identity && typeof patch.identity === "object") {
    p.identity = { ...p.identity, ...(patch.identity as Record<string, unknown>) };
  }
  for (const list of ["responsibilities", "liabilities", "eligibilities"] as const) {
    if (!Array.isArray(patch[list])) continue;
    for (const raw of patch[list] as Array<Partial<Entry>>) {
      if (!raw || !raw.label) continue;
      const key = raw.key || raw.label;
      const existing = p[list].find((x) => x.key === key);
      if (existing) existing.label = raw.label;
      else p[list].push({ key, label: raw.label });
    }
  }
  return p;
}

async function getApiKey(): Promise<string | undefined> {
  let apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const { env } = getCloudflareContext() as {
        env: { ANTHROPIC_API_KEY?: string };
      };
      apiKey = env?.ANTHROPIC_API_KEY;
    } catch {
      // not on Cloudflare — process.env is authoritative
    }
  }
  return apiKey;
}

export async function POST(req: NextRequest) {
  const { messages, profile, completed } = (await req.json()) as {
    messages: Array<{ role: string; content: unknown }>;
    profile?: Profile;
    completed?: string[];
  };

  const doneLabels = (completed ?? [])
    .map((id) => AGENT_SERVICES[id]?.label)
    .filter(Boolean);
  const systemPrompt = doneLabels.length
    ? `${SYSTEM}\n\n## Already done this session\nYou have already completed: ${doneLabels.join("; ")}. Do NOT do these again unless the citizen explicitly asks you to repeat one.`
    : SYSTEM;

  const apiKey = await getApiKey();
  if (!apiKey) {
    return Response.json({ error: "No ANTHROPIC_API_KEY" }, { status: 500 });
  }

  const adapter = new AnthropicAdapter();
  adapter.initialize({ apiKey });

  let working: Profile = profile ?? emptyProfile();
  let pendingAction: PendingAction | null = null;
  const loop = [...messages];
  let reply = "";

  for (let i = 0; i < 6; i++) {
    const input: AnthropicChatInput = {
      systemPrompt,
      messages: loop,
      tools: TOOLS,
    };
    const result = await adapter.execute({
      input,
      context: { sessionId: "", traceId: "", userId: "" },
    });
    if (!result.success) {
      return Response.json({ error: result.error }, { status: 500 });
    }
    const out = result.output as AnthropicChatOutput;

    // Capture any text — it can arrive alongside a tool call, not only on the
    // final turn.
    if (out.responseText && out.responseText.trim()) reply = out.responseText;

    if (out.stopReason === "tool_use") {
      loop.push({ role: "assistant", content: out.rawContent });
      const toolResults = out.toolCalls.map((tc) => {
        if (tc.name === "remember") {
          working = mergeProfile(working, tc.input);
          return { type: "tool_result", tool_use_id: tc.id, content: "Saved." };
        }
        if (tc.name === "act") {
          const svc = AGENT_SERVICES[String(tc.input.serviceId)];
          if (svc) {
            pendingAction = {
              serviceId: String(tc.input.serviceId),
              label: svc.label,
              dataShared: svc.dataShared,
              auth: svc.auth,
              summary: (tc.input.summary as string) || svc.label,
              resolves: svc.resolves,
            };
            return {
              type: "tool_result",
              tool_use_id: tc.id,
              content: "The citizen will now be asked to sign in.",
            };
          }
          return {
            type: "tool_result",
            tool_use_id: tc.id,
            content: "Unknown service.",
          };
        }
        return { type: "tool_result", tool_use_id: tc.id, content: "ok" };
      });
      loop.push({ role: "user", content: toolResults });
      if (pendingAction) break; // pause for the citizen's sign-in
      continue;
    }

    break;
  }

  return Response.json({ reply, profile: working, pendingAction });
}
