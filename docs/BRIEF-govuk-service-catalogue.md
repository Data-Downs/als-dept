# Brief: Seed Full GOV.UK Service Catalogue for Department Gap Analysis

> **Purpose**: Import the full GOV.UK service catalogue (1,544 services from `Services.xlsx`) into the legibility studio as lightweight catalogue entries, enabling department-level gap analysis that shows permanent secretaries exactly how much work remains to make their services agent-ready.
>
> **Trigger**: Department demo conversations require showing "Your department has 201 services. We've built full artefacts for 27 of them. Here are the 174 that still need work."

---

## 1. Problem Statement

We currently have 113 services with full artefacts (policy, state model, consent) and ~108 from the GOV.UK service graph. But the real scope of government is much larger — the `Services.xlsx` spreadsheet contains 1,544 services across all departments.

When presenting to permanent secretaries, we need to demonstrate:
- The **full scope** of their department's services
- Which services we've **already made legible** to agents
- Which services **still need artefacts** — and this is where their team's work begins

Without the full catalogue, we can only show what we've done. With it, we can show what remains — which is the more powerful story for getting department commitment.

---

## 2. Approach

Seed the 1,544 spreadsheet services as `source: "catalogue"` entries — a new source type that sits below "graph" and "full". These have a minimal manifest (name, department, GOV.UK URL, format) but no policy, state model, or consent artefacts. They appear in the gap analysis as "not started" and in the services list as a separate category.

Where a catalogue entry matches an existing full or graph service (by GOV.UK URL or name), we skip it — the richer version takes precedence.

---

## 3. Data Pipeline

### 3.1 Parse spreadsheet into JSON seed file

**Source**: `/Users/datadowns/Downloads/Services.xlsx`
**Output**: `data/govuk-services-catalogue.json`

Extract from each row:
- `link` — GOV.UK path (e.g. `/apply-for-probate`)
- `title` — service name
- `description` — short description
- `format` — guide, transaction, etc.
- `primary_department` — owning department name
- `service_available` — whether it has a transactional service
- `onelogin_available` — One Login integration status
- `online_available`, `email_available`, `phone_available`, `letter_available`, `inperson_available`, `form_available` — channel availability

Save as a static JSON file in the repo — no runtime Excel parsing needed.

### 3.2 Format classification

The spreadsheet's `format` field distinguishes between:

- **`transaction`** — services where citizens take an action (apply, register, pay, claim). These are the services agents can directly interact with. They are the priority for artefact creation.
- **`guide`** — informational content that explains how a service works. Agents need to reference these but they don't have a transactional state model.
- **Other formats** — answers, detailed guides, etc.

The `service_available` boolean flag also indicates whether the service has a transactional element even if the page format is "guide." Both signals should be captured.

In the UI, transactions should be visually distinguished from guides — transactions are the actionable services that need artefacts, guides are reference material.

### 3.3 Channel availability

The spreadsheet captures which channels each service is available through:

| Field | What it means |
|---|---|
| `online_available` | Has a digital/web service |
| `phone_available` | Available by phone |
| `email_available` | Email channel available |
| `letter_available` | Postal/letter channel |
| `inperson_available` | Face-to-face available |
| `form_available` | Downloadable form available |

This is valuable for department conversations:
- "Of your 201 services, only 87 are available online — 34 still require phone calls"
- "These 12 services are letter-only — prime candidates for agent-first delivery"

Channel data should be stored on the catalogue entry and surfaceable in the gap analysis and service detail views.

### 3.4 Department mapping

Map the spreadsheet's `primary_department` values to our department keys:

| Spreadsheet Department | department_key | Our Department Code |
|---|---|---|
| HM Revenue & Customs | hmrc | HMRC |
| Department for Work and Pensions | dwp | DWP |
| Home Office | home-office | Home Office |
| UK Visas and Immigration | home-office | Home Office |
| Border Force | home-office | Home Office |
| HM Passport Office | hmpo | Home Office |
| Driver and Vehicle Licensing Agency | dvla | DVLA |
| Driver and Vehicle Standards Agency | dvsa | DVLA |
| Department for Education | dfe | DfE |
| Student Loans Company | slc | DfE |
| HM Courts & Tribunals Service | hmcts | MoJ |
| Ministry of Justice | moj | MoJ |
| HM Prison Service | hmpps | MoJ |
| HM Prison and Probation Service | hmpps | MoJ |
| Disclosure and Barring Service | dbs | Home Office |
| Legal Aid Agency | laa | MoJ |
| (all others) | lowercase-hyphenated | — |

---

## 4. Prioritisation

Not all 1,544 services are equal. The brief defines three priority tiers:

### Tier 1: Demo-critical (persona-referenced)
Services directly referenced in the persona scenarios. These are the ones we walk through in department demos. Approximately 40 services across the 8 personas.

Flag these with `priority: "demo"` in the catalogue entry. They should appear first in filtered views, highlighted in the gap analysis, and be the obvious next candidates for artefact generation.

The persona-service mapping is already defined in the coverage matrix (`docs/personas.html`) and the `PERSONA_DEPARTMENTS` mapping.

### Tier 2: Transactional services
Services with `format: "transaction"` or `service_available: true`. These are the actionable services that agents can meaningfully interact with. They need artefacts to become agent-ready.

Flag with `priority: "transactional"`.

### Tier 3: Guides and reference
Everything else — informational content, guides, detailed explanations. Agents need to reference these but they don't need full state models or consent frameworks. Low priority for artefact creation.

Flag with `priority: "reference"`.

The gap analysis should default to showing Tier 1 and Tier 2 services, with Tier 3 collapsed or behind a "show all" toggle.

---

## 5. Changes Required

### 5.1 New file: `data/govuk-services-catalogue.json`

Static JSON array of all 1,544 services parsed from the spreadsheet. Each entry:

```json
{
  "id": "govuk-apply-for-probate",
  "title": "Applying for probate",
  "description": "How to apply for probate...",
  "link": "/applying-for-probate",
  "govuk_url": "https://www.gov.uk/applying-for-probate",
  "format": "guide",
  "primary_department": "HM Courts & Tribunals Service",
  "department_key": "hmcts",
  "service_available": false,
  "channels": {
    "online": false,
    "phone": true,
    "email": false,
    "letter": true,
    "inperson": false,
    "form": true
  },
  "priority": "demo"
}
```

### 5.2 `packages/service-store/src/types.ts`

Extend the service source type to include `"catalogue"`:

```typescript
type ServiceSource = "full" | "graph" | "catalogue";
```

Add optional fields for channel availability and priority:

```typescript
interface ServiceRow {
  // ... existing fields ...
  channels_json?: string;  // JSON string of channel availability
  priority?: "demo" | "transactional" | "reference";
}
```

### 5.3 `packages/service-store/src/service-store.ts`

Update `analyzeGaps()` to handle catalogue services — return all artefact gaps as "missing" since they have no artefacts. Catalogue services have 0% completeness by definition.

### 5.4 `packages/service-store/src/seed.ts`

Add a third seeding phase after graph and full services:

1. Load `govuk-services-catalogue.json`
2. For each entry, check if a service with the same `govuk_url` or matching name already exists (skip if so)
3. Create a minimal manifest: `{ id, name, department, description, govuk_url, format, channels, priority }`
4. Use `db.batch()` for bulk INSERT OR IGNORE (same pattern as graph services)
5. Return catalogue count in `SeedResult`

### 5.5 `apps/legibility-studio/app/gap-analysis/page.tsx`

- Add a **department summary dashboard** at the top:
  - Per-department card showing: total services, with artefacts, without, coverage %
  - Channel breakdown: "X online, Y phone-only, Z letter-only"
  - Format breakdown: "X transactions, Y guides"
- Catalogue services show as "Not started" in the detail table
- **Default view**: show Tier 1 (demo) and Tier 2 (transactional) services. Tier 3 (reference) collapsed behind "Show guides and reference material"
- Each row links to its GOV.UK page

### 5.6 `apps/legibility-studio/app/services/page.tsx`

- Add "catalogue" to the source filter pills (alongside "all", "full", "graph")
- Add "transactions" / "guides" format filter
- Catalogue services render with a grey badge: "Catalogue — no artefacts"
- Demo-priority services get a small highlight or "Demo" tag
- Department filter shows updated counts including catalogue services
- Typology dashboard includes catalogue services in totals but distinguishes them

### 5.7 `apps/legibility-studio/app/page.tsx` (home dashboard)

- Update headline KPIs:
  - "X services catalogued" (total across all sources)
  - "Y with full artefacts" (source: full)
  - "Z% coverage" (full / total)
  - "W transactional services still need artefacts" (the action gap)
- Per-department breakdown bar showing the coverage gap

---

## 6. Deduplication Strategy

When seeding catalogue entries, skip any where:

1. An existing service has the same `govuk_url` (match on the `/path` portion from the spreadsheet's `link` column)
2. An existing service name matches (case-insensitive, trimmed)

This ensures the 110 full-artefact services and ~108 graph services aren't duplicated. The catalogue fills the gaps — it's additive only.

---

## 7. What This Enables for Department Conversations

### Coverage story

When meeting with DWP's permanent secretary:

> "We've catalogued **115 DWP services** from GOV.UK. Of those, **21 have full artefacts** — complete policy rules, state models, and consent frameworks that agents can work with today. The remaining **94 are catalogued but need artefact work** — this is where your team comes in. Here's the list."

### Channel transformation story

> "Of your 115 services, **43 are online transactions** — the rest are phone, letter, or form-only. The 72 non-digital services are the biggest opportunity for agent-first delivery. Here are the ones citizens use most."

### Prioritisation story

> "We've identified **8 services** that your citizens most urgently need agents to handle — these are the ones in our demo scenarios. We recommend starting here. The full list of 115 is your roadmap."

The gap analysis becomes a work plan that departments can take ownership of.

---

## 8. Data Freshness

This is a **one-time import** from the `Services.xlsx` spreadsheet. The catalogue is a snapshot of GOV.UK services at the time of import.

If GOV.UK publishes an updated service list in the future, the seed script can be re-run with a new JSON file. The INSERT OR IGNORE pattern means new services are added, existing ones are untouched, and nothing is deleted. A manual review step should check for services that have been renamed or retired.

For now, the snapshot is sufficient for department conversations. We're not building a live sync with GOV.UK — that's a future infrastructure decision.

---

## 9. Implementation Order

1. Parse `Services.xlsx` → `data/govuk-services-catalogue.json` (with priority tagging)
2. Add `"catalogue"` source type and channel/priority fields to service store
3. D1 migration for new columns (channels_json, priority) if needed
4. Update seed script with catalogue phase
5. Update gap analysis page with department summary dashboard
6. Update services list with catalogue filter, format filter, and badges
7. Update home dashboard KPIs
8. Run `npm test` — fix any breakage
9. Seed the database and verify

---

## 10. What NOT to Change

- **Existing full-artefact services** — the 113 services with complete artefacts are untouched
- **Service graph services** — the ~108 graph services remain as-is
- **Citizen app** — this is a studio-only change; the citizen app doesn't see catalogue entries
- **Service artefact structure** — catalogue entries don't have artefacts, so no schema changes needed

---

## 11. Numbers

| Metric | Count |
|--------|-------|
| Spreadsheet total services | 1,544 |
| Existing services with full artefacts | 113 |
| Existing graph-only services | ~108 |
| Expected new catalogue entries (after dedup) | ~1,300+ |
| Our 6 target departments in spreadsheet | HMRC 201, DWP 115, Home Office 178, MoJ 93, DVLA/DVSA 136, DfE 56 |
| Estimated transactional services (format: transaction) | ~300-400 |
| Estimated demo-critical services (persona-referenced) | ~40 |
