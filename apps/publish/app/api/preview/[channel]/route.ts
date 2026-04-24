import { NextRequest, NextResponse } from "next/server";
import { getServiceArtefactStore } from "@/lib/service-store-init";
import {
  generateMcp,
  generateOpenApi,
  generateCatalogue,
  generateHtml,
} from "@als/publish-generators";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params;
  const serviceId = req.nextUrl.searchParams.get("serviceId");

  if (!serviceId) {
    return NextResponse.json(
      { error: "serviceId query param required" },
      { status: 400 }
    );
  }

  const store = await getServiceArtefactStore();
  const service = await store.getService(serviceId);

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const artefacts = {
    manifest: service.manifest || null,
    policy: service.policy || null,
    stateModel: service.stateModel || null,
    consent: service.consent || null,
    cardDefinitions: service.cardDefinitions || null,
  };

  try {
    let output: string;
    let contentType = "application/json";

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
        contentType = "text/html";
        break;
      default:
        return new NextResponse(
          `Generator for "${channel}" channel not yet implemented.`,
          { status: 501, headers: { "Content-Type": "text/plain" } }
        );
    }

    return new NextResponse(output, {
      headers: { "Content-Type": contentType },
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
