#!/usr/bin/env npx tsx
/**
 * Automated screen capture script.
 *
 * Drives the citizen app through full scripted conversations and captures
 * full-length screenshots (PNG) and self-contained HTML snapshots at each step.
 *
 * Handles consent flows automatically — clicks "I agree" on all consent grants,
 * then submits, before capturing the result.
 *
 * Usage:
 *   npx tsx scripts/capture-screens.ts              # run all scenarios
 *   npx tsx scripts/capture-screens.ts --scenario 0  # run a single scenario
 *   npx tsx scripts/capture-screens.ts --list         # list available scenarios
 *
 * Prerequisites:
 *   - Dev server running on port 3106 (`npm run dev`)
 *   - Playwright browsers installed (`npx playwright install chromium`)
 */

import { chromium, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ── Configuration ──

const BASE_URL = "http://localhost:3106";
const OUTPUT_DIR = path.resolve(__dirname, "../captures");

type Step =
  | { type: "message"; text: string }
  | { type: "consent" }; // auto-approve all consent grants and submit

interface Scenario {
  name: string;
  persona: string;
  agent: "dot" | "max";
  steps: Step[];
}

const SCENARIOS: Scenario[] = [
  // ── Sarah Okafor — bereavement (5 turns with consent) ──
  {
    name: "sarah-bereavement",
    persona: "sarah-okafor",
    agent: "dot",
    steps: [
      { type: "message", text: "My husband David has died. I don't know what to do." },
      { type: "message", text: "Yes please, start with Tell Us Once." },
      { type: "consent" },
      { type: "message", text: "What about the bereavement support payment?" },
      { type: "message", text: "Can you help with probate too?" },
    ],
  },

  // ── Daniel Obi — tax, unpaid invoice, MTD (4 turns, no consent) ──
  {
    name: "daniel-tax-issues",
    persona: "daniel-obi",
    agent: "dot",
    steps: [
      { type: "message", text: "I'm self-employed, a plumber. I'm confused about my tax and a client won't pay me." },
      { type: "message", text: "Sort the tax refund first." },
      { type: "message", text: "Now the client who won't pay — can you chase that?" },
      { type: "message", text: "What about Making Tax Digital?" },
    ],
  },

  // ── Marcus Taylor — prison leaver (4 turns with consent) ──
  {
    name: "marcus-prison-leaver",
    persona: "marcus-taylor",
    agent: "dot",
    steps: [
      { type: "message", text: "I've just been released from prison and need to sort everything out." },
      { type: "message", text: "Yes, start with Universal Credit." },
      { type: "consent" },
      { type: "message", text: "Can you renew my driving licence?" },
    ],
  },

  // ── Priya Anand — childcare and money (5 turns with consent) ──
  {
    name: "priya-childcare",
    persona: "priya-anand",
    agent: "dot",
    steps: [
      { type: "message", text: "I'm struggling with money. I've got a baby and a 4-year-old starting school." },
      { type: "message", text: "Yes please, start with the biggest saving." },
      { type: "consent" },
      { type: "message", text: "Yes, check my Universal Credit entitlement." },
      { type: "message", text: "What about the Sure Start grant for the baby?" },
    ],
  },

  // ── James Whitfield — PIP + EHCP (4 turns with consent) ──
  {
    name: "james-pip-ehcp",
    persona: "james-whitfield",
    agent: "dot",
    steps: [
      { type: "message", text: "My PIP has been turned down and my son's EHCP is stuck. I don't know what to do." },
      { type: "message", text: "The PIP appeal first please." },
      { type: "consent" },
      { type: "message", text: "Now what about Owen's EHCP?" },
    ],
  },
];

// ── Helpers ──

async function waitForResponse(page: Page): Promise<void> {
  // Wait for the typing indicator to appear
  await page.waitForFunction(
    () => document.querySelector('[class*="animate-bounce-dot"]') !== null,
    { timeout: 5000 },
  ).catch(() => {
    // Demo scripts may respond so fast the indicator never appears
  });

  // Wait for the typing indicator to disappear
  await page.waitForFunction(
    () => document.querySelector('[class*="animate-bounce-dot"]') === null,
    { timeout: 60000 },
  );

  // Let React finish rendering cards, outcomes, etc.
  await page.waitForTimeout(1000);
}

async function handleConsent(page: Page): Promise<void> {
  // Wait for consent cards to render
  await page.waitForTimeout(500);

  // Click all "I agree" buttons
  const agreeButtons = page.locator('button:has-text("I agree")');
  const count = await agreeButtons.count();
  for (let i = 0; i < count; i++) {
    await agreeButtons.nth(i).click();
    await page.waitForTimeout(200);
  }

  // Wait for the submit button to appear and click it
  const submitButton = page.locator('button:has-text("Submit")').first();
  await submitButton.waitFor({ timeout: 5000 });
  await submitButton.click();

  // Wait for the consent submission to trigger a response
  await waitForResponse(page);
}

let captureCounter = 0;

async function capture(
  page: Page,
  scenario: Scenario,
  label: string,
): Promise<void> {
  captureCounter++;
  const dir = path.join(OUTPUT_DIR, scenario.name);
  fs.mkdirSync(dir, { recursive: true });

  const suffix = String(captureCounter).padStart(2, "0");

  // Measure content to expand viewport
  const contentHeight = await page.evaluate(() => {
    const main = document.querySelector("main");
    return main ? main.scrollHeight : document.body.scrollHeight;
  });
  const headerHeight = await page.evaluate(() => {
    const header = document.querySelector("header");
    return header ? header.getBoundingClientRect().height : 100;
  });
  const fullHeight = Math.max(900, contentHeight + headerHeight + 100);

  // Temporarily resize for full-length capture
  await page.setViewportSize({ width: 440, height: fullHeight });
  await page.waitForTimeout(300);

  // PNG
  const pngPath = path.join(dir, `${suffix}_${label}.png`);
  await page.screenshot({ path: pngPath, fullPage: true, type: "png" });
  console.log(`  📸 ${pngPath}`);

  // HTML — self-contained with inlined styles
  const htmlContent = await page.evaluate(() => {
    const styles: string[] = [];
    for (const sheet of document.styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
        styles.push(`<style>${rules}</style>`);
      } catch {
        if (sheet.href) styles.push(`<link rel="stylesheet" href="${sheet.href}">`);
      }
    }
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GOV.UK Capture</title>
  ${styles.join("\n  ")}
  <style>body { margin: 0; }</style>
</head>
<body>${document.body.innerHTML}</body>
</html>`;
  });
  const htmlPath = path.join(dir, `${suffix}_${label}.html`);
  fs.writeFileSync(htmlPath, htmlContent, "utf-8");
  console.log(`  📄 ${htmlPath}`);

  // Reset viewport
  await page.setViewportSize({ width: 440, height: 900 });
}

// ── Main ──

async function runScenario(
  scenario: Scenario,
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<void> {
  console.log(
    `\n▶ ${scenario.name} (${scenario.persona}, agent: ${scenario.agent})`,
  );
  captureCounter = 0;

  const context = await browser.newContext({
    viewport: { width: 440, height: 900 },
  });
  const page = await context.newPage();

  // Set persona and agent in sessionStorage, then load
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ persona, agent }) => {
      sessionStorage.setItem("c02_persona", persona);
      sessionStorage.setItem("c02_agent", agent);
    },
    { persona: scenario.persona, agent: scenario.agent },
  );
  await page.reload({ waitUntil: "domcontentloaded" });

  // Wait for persona data to load
  await page.waitForSelector('[aria-label="Open personal data dashboard"]', {
    timeout: 30000,
  });

  // Navigate to chat
  const agentLabel = scenario.agent === "max" ? "Max" : "Dot";
  const chatTab = page.locator(`button:has-text("${agentLabel}")`);
  if (await chatTab.isVisible()) {
    await chatTab.click();
  }
  await page.waitForTimeout(500);

  // Run through each step
  for (const step of scenario.steps) {
    if (step.type === "message") {
      const preview = step.text.slice(0, 60) + (step.text.length > 60 ? "…" : "");
      console.log(`  💬 "${preview}"`);

      const input = page.locator("textarea");
      await input.fill(step.text);
      await page.keyboard.press("Enter");
      await waitForResponse(page);

      // Generate a label from the message
      const label = step.text
        .slice(0, 40)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      await capture(page, scenario, label);
    } else if (step.type === "consent") {
      console.log(`  🔐 Handling consent flow`);
      await handleConsent(page);
      await capture(page, scenario, "after-consent");
    }
  }

  await context.close();
  console.log(`  ✅ ${captureCounter} captures saved`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    console.log("Available scenarios:");
    SCENARIOS.forEach((s, i) => {
      console.log(`  ${i}: ${s.name} (${s.persona}, ${s.agent}) — ${s.steps.length} steps`);
    });
    return;
  }

  const scenarioIdx = args.indexOf("--scenario");
  const targetScenario =
    scenarioIdx !== -1 ? parseInt(args[scenarioIdx + 1], 10) : null;

  const scenarios =
    targetScenario !== null ? [SCENARIOS[targetScenario]] : SCENARIOS;

  if (scenarios.some((s) => !s)) {
    console.error(`Invalid scenario index: ${targetScenario}`);
    process.exit(1);
  }

  console.log(`🎬 Capturing ${scenarios.length} scenario(s)`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const scenario of scenarios) {
    try {
      await runScenario(scenario, browser);
    } catch (err) {
      console.error(`  ✗ Failed: ${(err as Error).message}`);
    }
  }

  await browser.close();
  console.log(`\n✅ Done. Captures saved to ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
