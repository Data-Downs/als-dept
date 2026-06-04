import { NextResponse } from "next/server";
import { servicesToLlmsTxt, plansToLlmsTxt } from "@als/schemas";
import {
  getServiceArtefactStore,
  getPlanTemplateStore,
} from "@/lib/service-store-init";

/**
 * GET /llms.txt
 * An llms.txt-style index of every service and plan, linking to each Markdown
 * capability card. Lets an agent discover services and life-event plans, then
 * fetch the prose description before calling the structured tools.
 */
export async function GET() {
  const store = await getServiceArtefactStore();
  const services = await store.listServices();

  const servicesIndex = servicesToLlmsTxt(
    services.map((s) => ({
      id: s.id,
      name: s.name,
      department: s.department,
      description: s.description,
    })),
    { cardUrl: (id) => `/services/${encodeURIComponent(id)}/md` },
  );

  const planStore = await getPlanTemplateStore();
  const plans = await planStore.listPlans({ published: true });
  const plansIndex = plansToLlmsTxt(
    plans.map((p) => ({ id: p.id, name: p.name, description: p.description })),
  );

  const index = `${servicesIndex}\n${plansIndex}`;

  return new NextResponse(index, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
