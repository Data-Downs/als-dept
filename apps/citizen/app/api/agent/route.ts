import { NextRequest } from "next/server";
import {
  AnthropicAdapter,
  type AnthropicChatInput,
  type AnthropicChatOutput,
} from "@als/adapters";

/**
 * The agent layer (V1 — the citizen's agent). A bare LLM agent that gets to
 * know the person and builds a profile of what they're responsible for. This
 * is deliberately NOT the fake-GOV.UK app — it's a single prompt window with a
 * cohort behind it. Discovery only for now; acting on services comes next.
 */

type Profile = {
  identity: Record<string, unknown>;
  responsibilities: string[];
  liabilities: string[];
  eligibilities: string[];
};

const emptyProfile = (): Profile => ({
  identity: {},
  responsibilities: [],
  liabilities: [],
  eligibilities: [],
});

const SYSTEM = `You are a citizen's personal government agent — a calm, brilliant assistant who deals with the entire UK state on their behalf, so they never have to touch government directly.

You are in DISCOVERY. Get to know the person: their name, roughly their age, where they live, and their situation — do they run a business, own a car or a home, have children, a job, a pension. Be warm, genuinely curious, and brief. Ask ONE thing at a time. Reflect back what you understand in a sentence. Never lecture, never list government services, never mention forms or logins yet.

Whenever you learn something concrete, call the remember tool: set identity fields (name, age, location, job, etc.) and add anything they are responsible for — "A limited company", "A car", "A home", "A child" — to responsibilities. You do not act on anything or ask for any logins yet; you are only building a picture.

Open by introducing yourself in one or two warm sentences and asking their name.`;

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
            "Identity fields to merge, e.g. { name, age, location, job }.",
          additionalProperties: true,
        },
        responsibilities: {
          type: "array",
          items: { type: "string" },
          description:
            "Things the person is responsible for, e.g. 'A limited company', 'A car'.",
        },
      },
    },
  },
];

function mergeProfile(profile: Profile, patch: Record<string, unknown>): Profile {
  const p: Profile = {
    ...emptyProfile(),
    ...profile,
    identity: { ...emptyProfile().identity, ...profile?.identity },
  };
  if (patch.identity && typeof patch.identity === "object") {
    p.identity = { ...p.identity, ...(patch.identity as Record<string, unknown>) };
  }
  if (Array.isArray(patch.responsibilities)) {
    for (const r of patch.responsibilities as string[]) {
      if (r && !p.responsibilities.includes(r)) p.responsibilities.push(r);
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
  const { messages, profile } = (await req.json()) as {
    messages: Array<{ role: string; content: unknown }>;
    profile?: Profile;
  };

  const apiKey = await getApiKey();
  if (!apiKey) {
    return Response.json({ error: "No ANTHROPIC_API_KEY" }, { status: 500 });
  }

  const adapter = new AnthropicAdapter();
  adapter.initialize({ apiKey });

  let working: Profile = profile ?? emptyProfile();
  const loop = [...messages];
  let reply = "";

  for (let i = 0; i < 5; i++) {
    const input: AnthropicChatInput = {
      systemPrompt: SYSTEM,
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

    // Capture any text the model produced — it can arrive ALONGSIDE a tool
    // call, not only on the final turn. Losing this is what made the agent go
    // silent after recording something.
    if (out.responseText && out.responseText.trim()) reply = out.responseText;

    if (out.stopReason === "tool_use") {
      loop.push({ role: "assistant", content: out.rawContent });
      const toolResults = out.toolCalls.map((tc) => {
        if (tc.name === "remember") working = mergeProfile(working, tc.input);
        return { type: "tool_result", tool_use_id: tc.id, content: "Saved." };
      });
      loop.push({ role: "user", content: toolResults });
      continue;
    }

    break;
  }

  return Response.json({ reply, profile: working });
}
