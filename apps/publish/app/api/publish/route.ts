import { NextRequest, NextResponse } from "next/server";
import { getServiceArtefactStore } from "@/lib/service-store-init";
import {
  generateMcp,
  generateOpenApi,
  generateCatalogue,
  generateHtml,
} from "@als/publish-generators";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { serviceId, channels } = body as {
    serviceId: string;
    channels: string[];
  };

  if (!serviceId || !channels?.length) {
    return NextResponse.json(
      { error: "serviceId and channels are required" },
      { status: 400 }
    );
  }

  const store = await getServiceArtefactStore();
  const service = await store.getService(serviceId);

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const results: Record<string, { status: string; output?: string }> = {};

  for (const channel of channels) {
    try {
      let output: string;
      const artefacts = {
        manifest: service.manifest || null,
        policy: service.policy || null,
        stateModel: service.stateModel || null,
        consent: service.consent || null,
        cardDefinitions: service.cardDefinitions || null,
      };

      switch (channel) {
        case "mcp":
          output = JSON.stringify(generateMcp(artefacts), null, 2);
          break;
        case "openapi":
          output = JSON.stringify(generateOpenApi(artefacts), null, 2);
          break;
        case "catalogue":
          output = JSON.stringify(generateCatalogue(artefacts), null, 2);
          break;
        case "html":
          output = generateHtml(artefacts);
          break;
        default:
          output = `Generator for "${channel}" not yet implemented.`;
      }

      results[channel] = { status: "published", output };
    } catch (err) {
      results[channel] = {
        status: "error",
        output: String(err),
      };
    }
  }

  return NextResponse.json({ serviceId, results });
}
