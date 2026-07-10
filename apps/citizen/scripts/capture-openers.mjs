/**
 * Focused re-capture: just the openers + trays, with the model-populated gate.
 * No agent-detail navigation (that flow is flaky and cascades) — those pages are
 * already captured correctly. Run: node scripts/capture-openers.mjs
 */
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../../../showcase/public/screenshots");
const CITIZEN = "http://localhost:3106/agent";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function settle(page, cap = 22000) {
  const start = Date.now();
  let last = "", stable = 0;
  while (Date.now() - start < cap) {
    const t = await page.locator("main, [class*='overflow-y-auto']").first().innerText().catch(() => "");
    if (t === last && t.length > 40) { stable += 500; if (stable >= 2200) return; }
    else { stable = 0; last = t; }
    await sleep(500);
  }
}
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log("  ✓", name); };

async function pick(page, labelRegex, token) {
  await page.keyboard.press("Escape").catch(() => {});
  await settle(page, 12000);
  const menuBtn = page.locator("header button").filter({ hasText: /New user|Patel|Okafor|Nowak|Summers|Parker|Citizen/ }).last();
  await menuBtn.waitFor({ state: "visible", timeout: 8000 });
  await menuBtn.click({ timeout: 8000 });
  await sleep(400);
  await page.getByRole("button", { name: labelRegex }).first().click({ timeout: 8000 });
  const start = page.getByRole("button", { name: /Start the demo/ });
  await start.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  if (await start.isVisible().catch(() => false)) await start.click();
  if (token) {
    await page.getByText(token, { exact: false }).first().waitFor({ state: "visible", timeout: 18000 })
      .catch(() => console.log("  ! token not seen:", token));
  }
  await sleep(1200);
  await settle(page);
  await sleep(700);
}

const PERSONAS = [
  { label: /Rajesh/, token: "RKP Consulting", id: "rajesh" },
  { label: /Sarah/, token: "David", id: "sarah" },
  { label: /Fatima/, token: "Kasia", id: "fatima" },
  { label: /Emma/, token: "Expecting", id: "emma" },
  { label: /Mary/, token: "Jaguar", id: "mary" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(CITIZEN, { waitUntil: "networkidle" });
await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("als-")).forEach((k) => localStorage.removeItem(k)));
await page.goto(CITIZEN, { waitUntil: "networkidle" });
await sleep(1500); await settle(page);
await shot(page, "coldopen-newuser");

for (const p of PERSONAS) {
  console.log("persona:", p.label);
  try {
    await pick(page, p.label, p.token);
    await shot(page, `opener-${p.id}`);
    await page.getByRole("button", { name: "Your agents" }).click({ timeout: 6000 });
    await sleep(700);
    await shot(page, `tray-${p.id}`);
    await page.getByRole("button", { name: "Close" }).first().click({ timeout: 4000 }).catch(() => {});
    await sleep(400);
  } catch (e) { console.log("  ✗", p.id, String(e).split("\n")[0]); }
}
await browser.close();
console.log("done →", OUT);
