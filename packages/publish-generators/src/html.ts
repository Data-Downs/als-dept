import type { ServiceArtefacts } from "./types";

/**
 * Generate an accessible, printable HTML summary page from service artefacts.
 */
export function generateHtml(artefacts: ServiceArtefacts): string {
  const { manifest, policy, stateModel, consent, cardDefinitions } = artefacts;

  const name = manifest?.name || "Unknown service";
  const dept = manifest?.department || "Unknown department";

  const sections: string[] = [];

  // Service overview
  sections.push(`
    <section>
      <h2>Service overview</h2>
      <dl>
        <dt>Department</dt><dd>${escapeHtml(dept)}</dd>
        ${manifest?.description ? `<dt>Description</dt><dd>${escapeHtml(manifest.description)}</dd>` : ""}
        ${manifest?.jurisdiction ? `<dt>Jurisdiction</dt><dd>${escapeHtml(manifest.jurisdiction)}</dd>` : ""}
        ${manifest?.serviceType ? `<dt>Service type</dt><dd>${escapeHtml(manifest.serviceType)}</dd>` : ""}
        ${manifest?.constraints?.sla ? `<dt>SLA</dt><dd>${escapeHtml(manifest.constraints.sla)}</dd>` : ""}
        ${manifest?.constraints?.fee ? `<dt>Fee</dt><dd>${escapeHtml(String(manifest.constraints.fee))}</dd>` : ""}
      </dl>
    </section>
  `);

  // Eligibility
  if (policy && policy.rules.length > 0) {
    const ruleItems = policy.rules
      .map(
        (r) =>
          `<li><strong>${escapeHtml(r.description)}</strong>${r.reason_if_failed ? `<br><span class="hint">${escapeHtml(r.reason_if_failed)}</span>` : ""}</li>`
      )
      .join("\n");

    sections.push(`
      <section>
        <h2>Eligibility</h2>
        ${policy.explanation_template ? `<p>${escapeHtml(policy.explanation_template)}</p>` : ""}
        <ul>${ruleItems}</ul>
        ${
          policy.edge_cases && policy.edge_cases.length > 0
            ? `<h3>Edge cases</h3><ul>${policy.edge_cases.map((e) => `<li><strong>${escapeHtml(e.description)}</strong><br><span class="hint">${escapeHtml(e.action)}</span></li>`).join("\n")}</ul>`
            : ""
        }
      </section>
    `);
  }

  // Journey steps
  if (stateModel && stateModel.states.length > 0) {
    const stateItems = stateModel.states
      .map((s) => {
        const typeLabel =
          s.type === "initial"
            ? " (start)"
            : s.type === "terminal"
              ? " (end)"
              : "";
        return `<li>${escapeHtml(s.id)}${typeLabel}</li>`;
      })
      .join("\n");

    sections.push(`
      <section>
        <h2>Journey steps</h2>
        <ol>${stateItems}</ol>
      </section>
    `);
  }

  // What you'll need (from card definitions)
  if (cardDefinitions && cardDefinitions.length > 0) {
    const fieldItems = cardDefinitions
      .flatMap((c) =>
        c.fields.map(
          (f) =>
            `<li>${escapeHtml(f.label)}${f.required ? " <em>(required)</em>" : ""} — ${escapeHtml(f.type)}</li>`
        )
      )
      .join("\n");

    sections.push(`
      <section>
        <h2>What you'll need</h2>
        <ul>${fieldItems}</ul>
      </section>
    `);
  }

  // Data sharing
  if (consent && consent.grants.length > 0) {
    const grantItems = consent.grants
      .map(
        (g) =>
          `<li>
            <strong>${escapeHtml(g.description)}</strong><br>
            <span class="hint">Data shared: ${g.data_shared.map(escapeHtml).join(", ")}</span><br>
            <span class="hint">Purpose: ${escapeHtml(g.purpose)}</span><br>
            <span class="hint">Duration: ${escapeHtml(g.duration)}</span>
          </li>`
      )
      .join("\n");

    sections.push(`
      <section>
        <h2>Data sharing</h2>
        <ul>${grantItems}</ul>
        ${consent.revocation ? `<p><strong>Revocation:</strong> ${escapeHtml(consent.revocation.mechanism)}</p>` : ""}
      </section>
    `);
  }

  // Complaints and appeals
  if (manifest?.redress) {
    const redress = manifest.redress;
    sections.push(`
      <section>
        <h2>Complaints and appeals</h2>
        <dl>
          ${redress.complaint_url ? `<dt>Complaint</dt><dd><a href="${escapeHtml(redress.complaint_url)}">${escapeHtml(redress.complaint_url)}</a></dd>` : ""}
          ${redress.appeal_process ? `<dt>Appeal process</dt><dd>${escapeHtml(redress.appeal_process)}</dd>` : ""}
          ${redress.ombudsman ? `<dt>Ombudsman</dt><dd>${escapeHtml(redress.ombudsman)}</dd>` : ""}
        </dl>
      </section>
    `);
  }

  // Contact
  if (manifest?.handoff) {
    const h = manifest.handoff;
    sections.push(`
      <section>
        <h2>Contact</h2>
        <dl>
          ${h.escalation_phone ? `<dt>Phone</dt><dd>${escapeHtml(h.escalation_phone)}</dd>` : ""}
          ${h.opening_hours ? `<dt>Hours</dt><dd>${escapeHtml(h.opening_hours)}</dd>` : ""}
        </dl>
      </section>
    `);
  }

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(name)} — Service summary</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0b0c0c; line-height: 1.6; max-width: 740px; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 2rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.4rem; margin-top: 2rem; padding-bottom: 0.3rem; border-bottom: 2px solid #0b0c0c; }
    h3 { font-size: 1.1rem; margin-top: 1rem; }
    dt { font-weight: bold; margin-top: 0.5rem; }
    dd { margin-left: 0; margin-bottom: 0.5rem; }
    ul, ol { padding-left: 1.5rem; }
    li { margin-bottom: 0.5rem; }
    .hint { color: #505a5f; font-size: 0.9em; }
    .dept { color: #505a5f; font-size: 1.1rem; margin-bottom: 1.5rem; }
    a { color: #1d70b8; }
    @media print { body { max-width: none; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(name)}</h1>
  <p class="dept">${escapeHtml(dept)}</p>
  ${sections.join("\n")}
  <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #b1b4b6; font-size: 0.8rem; color: #505a5f;">
    Generated by Publish Once — Agentic Legibility Stack
  </footer>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
