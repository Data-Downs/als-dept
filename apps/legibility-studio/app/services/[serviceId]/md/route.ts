import { NextRequest, NextResponse } from "next/server";
import { serviceToMarkdown } from "@als/schemas";
import { getServiceArtefactStore } from "@/lib/service-store-init";

/**
 * GET /services/[serviceId]/md
 * Renders the service's artefacts as a Markdown capability card (text/markdown).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await params;
  const store = await getServiceArtefactStore();
  const service = await store.getService(serviceId);

  if (!service) {
    return new NextResponse("Service not found", { status: 404 });
  }

  const markdown = serviceToMarkdown({
    manifest: service.manifest,
    policy: service.policy,
    stateModel: service.stateModel,
    consent: service.consent,
  });

  return new NextResponse(markdown, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
