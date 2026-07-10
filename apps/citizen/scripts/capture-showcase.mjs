/**
 * Capture the showcase screenshot library from the running dev servers.
 *  Citizen agent app  → http://localhost:3106/agent
 *  Legibility studio  → http://localhost:3101
 *
 * Produces real PNGs into ../../showcase/public/screenshots so the report site
 * can reference them as ordinary <img> assets. Run: node scripts/capture-showcase.mjs
 */
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../../../showcase/public/screenshots");
const CITIZEN = "http://localhost:3106/agent";
const STUDIO = "http://localhost:3101";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait until the streamed assistant text stops growing (or a hard cap). */
async function waitForStreamSettle(page, { cap = 26000 } = {}) {
  const start = Date.now();
  let last = "";
  let stableFor = 0;
  while (Date.now() - start < cap) {
    const text = await page
      .locator("main, [class*='overflow-y-auto']")
      .first()
      .innerText()
      .catch(() => "");
    if (text === last && text.length > 40) {
      stableFor += 500;
      if (stableFor >= 2200) return;
    } else {
      stableFor = 0;
      last = text;
    }
    await sleep(500);
  }
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log("  ✓", name);
}

async function shotEl(page, locator, name) {
  try {
    await locator.first().screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log("  ✓", name, "(element)");
  } catch (e) {
    console.log("  ✗", name, "element failed —", String(e).split("\n")[0]);
  }
}

async function resetChat(page) {
  // Reload restores the persisted last persona and returns to a clean chat.
  await page.goto(CITIZEN, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Your agents" })
    .waitFor({ state: "visible", timeout: 12000 });
  await sleep(1200);
}

async function openMenuAndPick(page, labelRegex, token) {
  // No reload — a reload kicks off a racing new-user cold-open stream that
  // collides with the persona load. Settle any in-flight stream instead.
  await page.keyboard.press("Escape").catch(() => {});
  await waitForStreamSettle(page, { cap: 12000 });
  const menuBtn = page
    .locator("header button")
    .filter({ hasText: /New user|Patel|Okafor|Nowak|Summers|Parker|Citizen/ })
    .last();
  await menuBtn.waitFor({ state: "visible", timeout: 8000 });
  await menuBtn.click({ timeout: 8000 });
  await sleep(400);
  await page.getByRole("button", { name: labelRegex }).first().click({ timeout: 8000 });
  const start = page.getByRole("button", { name: /Start the demo/ });
  await start.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  if (await start.isVisible().catch(() => false)) await start.click();
  // Gate on the seed actually loading: a persona-specific token appears.
  if (token) {
    await page.getByText(token, { exact: false }).first()
      .waitFor({ state: "visible", timeout: 18000 })
      .catch(() => console.log("  ! token not seen:", token));
  }
  await sleep(1100);
  await waitForStreamSettle(page);
  await sleep(700);
}

async function closeTray(page) {
  // Tray drawer covers the header toggle; close it via its own Close button.
  await page.getByRole("button", { name: "Close" }).first().click({ timeout: 4000 }).catch(() => {});
  await sleep(300);
}

async function openAgentDetail(page, nameRegex, outName) {
  // In place: relies on the persona's roster already being loaded.
  await page.getByRole("button", { name: "Your agents" }).click({ timeout: 8000 });
  const agentBtn = page.getByRole("button", { name: nameRegex }).first();
  await agentBtn.waitFor({ state: "visible", timeout: 10000 });
  await sleep(300);
  await agentBtn.click({ timeout: 8000 });
  await sleep(1100);
  await shot(page, outName);
  await page.getByRole("button", { name: "Back" }).click({ timeout: 8000 }).catch(() => {});
  await page.getByRole("button", { name: "Your agents" }).waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  await sleep(300);
}

// Persona → { menu label regex, opener file, tray file, panel file, agents:[[nameRegex,file]] }
const PERSONAS = [
  {
    label: /Rajesh/, token: "RKP Consulting", opener: "opener-rajesh", tray: "tray-rajesh", panel: "panel-rajesh",
    agents: [[/Reg/, "agent-reg"], [/Miles/, "agent-miles"], [/Fay/, "agent-fay"]],
    wallet: true,
  },
  {
    label: /Sarah/, token: "David", opener: "opener-sarah", tray: "tray-sarah", panel: "panel-sarah",
    agents: [[/Grace/, "agent-grace"], [/Iris/, "agent-iris"]],
  },
  {
    label: /Fatima/, token: "Kasia", opener: "opener-fatima", tray: "tray-fatima", panel: "panel-fatima",
    agents: [[/Cass/, "agent-cass"]],
  },
  {
    label: /Emma/, token: "Expecting", opener: "opener-emma", tray: "tray-emma",
    agents: [[/Robin/, "agent-robin"]],
  },
  {
    label: /Mary/, token: "Jaguar", opener: "opener-mary", tray: "tray-mary",
    agents: [],
  },
];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1360, height: 1000 },
    deviceScaleFactor: 2,
  });

  // ---- Citizen: clean new-user cold open ----
  console.log("citizen: new-user cold open");
  await page.goto(CITIZEN, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    Object.keys(localStorage).filter((k) => k.startsWith("als-")).forEach((k) => localStorage.removeItem(k));
  });
  await page.goto(CITIZEN, { waitUntil: "networkidle" });
  await sleep(1500);
  await waitForStreamSettle(page);
  await shot(page, "coldopen-newuser");

  // ---- Each persona: opener, panel, tray, agent detail pages, wallet ----
  for (const p of PERSONAS) {
    console.log("citizen persona:", p.label);
    try {
      await openMenuAndPick(page, p.label, p.token);
      await shot(page, p.opener);
      if (p.panel) {
        await shotEl(page, page.locator("aside, [class*='w-']").filter({ hasText: "What your agents know" }), p.panel);
      }
      // tray
      await page.getByRole("button", { name: "Your agents" }).click();
      await sleep(700);
      await shot(page, p.tray);
      await closeTray(page);
      // agent detail pages (in place — roster is loaded post-opener)
      for (const [re, file] of p.agents) {
        await openAgentDetail(page, re, file).catch((e) => console.log("  ✗", file, String(e).split("\n")[0]));
      }
      // wallet
      if (p.wallet) {
        await page.getByRole("button", { name: "Wallet" }).click({ timeout: 6000 }).catch(() => {});
        await sleep(900);
        await shot(page, "wallet");
        await closeTray(page);
      }
    } catch (e) {
      console.log("  ✗ persona failed:", String(e).split("\n")[0]);
    }
  }

  // ---- Studio: department side ----
  console.log("studio: department side");
  const studioShots = [
    ["", "studio-dashboard"],
    ["/services", "studio-services"],
    ["/gap-analysis", "studio-gap"],
    ["/evidence", "studio-evidence"],
  ];
  for (const [route, name] of studioShots) {
    try {
      await page.goto(STUDIO + route, { waitUntil: "networkidle" });
      await sleep(1500);
      await shot(page, name);
    } catch (e) {
      console.log("  ✗", name, String(e).split("\n")[0]);
    }
  }
  // evidence trace: click first session
  try {
    await page.goto(STUDIO + "/evidence", { waitUntil: "networkidle" });
    await sleep(1200);
    await page.locator("[class*='trace_'], button, a").filter({ hasText: /trace_/ }).first().click();
    await sleep(1500);
    await shot(page, "studio-trace");
  } catch (e) {
    console.log("  ✗ studio-trace", String(e).split("\n")[0]);
  }

  await browser.close();
  console.log("\nDone →", OUT);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
