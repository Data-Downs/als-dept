import { NextResponse } from "next/server";
import { ServiceGraphEngine } from "@als/service-graph";

let engine: ServiceGraphEngine | null = null;
function getEngine(): ServiceGraphEngine {
  if (!engine) engine = new ServiceGraphEngine();
  return engine;
}

export async function GET() {
  const graph = getEngine();
  const lifeEvents = graph.getLifeEvents();

  const result = lifeEvents.map((le) => {
    const allServices = graph.getLifeEventServices(le.id);
    const serviceDetails = allServices.map((svc) => ({
      id: svc.id,
      name: svc.name,
      dept: svc.dept,
      serviceType: svc.serviceType,
    }));

    return {
      id: le.id,
      icon: le.icon,
      name: le.name,
      desc: le.desc,
      totalServiceCount: allServices.length,
      services: serviceDetails.slice(0, 8),
    };
  });

  return NextResponse.json(result);
}
