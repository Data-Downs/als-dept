import {
  ServiceArtefactStore,
  ServiceGraphStore,
  PlanTemplateStore,
  DecisionGateStore,
  seedServiceStore,
} from "@als/service-store";
import type { DatabaseAdapter } from "@als/evidence";

let adapter: DatabaseAdapter | null = null;
let artefactStore: ServiceArtefactStore | null = null;
let graphStore: ServiceGraphStore | null = null;
let planStore: PlanTemplateStore | null = null;
let gateStore: DecisionGateStore | null = null;
let initPromise: Promise<void> | null = null;

async function ensureInit(): Promise<void> {
  if (adapter) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const path = await import("path");
      const { SqliteAdapter } = await import("@als/evidence/sqlite");
      const dbPath = path.join(
        process.cwd(),
        "..",
        "..",
        "data",
        "services.db",
      );
      adapter = await SqliteAdapter.create(dbPath);

      artefactStore = new ServiceArtefactStore(adapter);
      graphStore = new ServiceGraphStore(adapter);
      planStore = new PlanTemplateStore(adapter);
      gateStore = new DecisionGateStore(adapter);

      await artefactStore.init();
      await graphStore.init();
      await planStore.init();
      await gateStore.init();

      const isEmpty = await artefactStore.isEmpty();
      if (isEmpty) {
        await seedServiceStore(adapter, { clear: false });
      }
    } catch (err) {
      initPromise = null;
      adapter = null;
      throw err;
    }
  })();

  return initPromise;
}

export async function getServiceArtefactStore(): Promise<ServiceArtefactStore> {
  await ensureInit();
  return artefactStore!;
}

export async function getServiceGraphStore(): Promise<ServiceGraphStore> {
  await ensureInit();
  return graphStore!;
}

export async function getPlanTemplateStore(): Promise<PlanTemplateStore> {
  await ensureInit();
  return planStore!;
}

export async function getDecisionGateStore(): Promise<DecisionGateStore> {
  await ensureInit();
  return gateStore!;
}
