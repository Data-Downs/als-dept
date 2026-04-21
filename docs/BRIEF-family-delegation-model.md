# Brief: Family Relationships, Delegation & Multi-User Model

> **Purpose**: Design and implement a relationship and permissions model that allows citizens to act on behalf of family members, share visibility into government interactions, and manage delegation controls independently.
>
> **Why this matters**: A parent booking a school place for their child, a spouse managing probate on behalf of a deceased partner, an adult child helping an elderly parent with Attendance Allowance — these are not edge cases. They are the majority of how government services are actually used. The GOV.UK app must be multi-player from the start.
>
> **Trigger**: The Nowak family persona (Fatima & Tomasz) must become two individual personas with a shared family relationship. This brief specifies the data model, permissions system, and UX patterns needed.

---

## 1. Problem Statement

The current data model assumes one citizen = one profile = one set of interactions. But real government use is relational:

- **Fatima** checks Adam's EHCP status, applies for Kasia's free school meals, and manages Lily's Reception enrolment — all on behalf of her children
- **Tomasz** applies for his own eVisa, exchanges his driving licence, and can see that Fatima has submitted Adam's EHCP — because they share parental responsibility
- **Sarah** acts as executor of her deceased husband's estate — a legal delegation that crosses MoJ, HMRC, and DWP
- **James** and his wife Claire jointly manage Owen's EHCP application and PIP appeal — either parent needs to be able to pick up where the other left off

The app needs to model: who is related to whom, what permissions each person grants, what actions someone can take on another's behalf, and how notifications flow when one person acts for another.

---

## 2. Core Concepts

### 2.1 Relationship Types

```typescript
type RelationshipType =
  | "spouse"           // Married or civil partner — broad mutual visibility
  | "partner"          // Cohabiting partner — visibility by explicit grant only
  | "parent_of"        // Parent → child — full authority over minor child
  | "child_of"         // Adult child → elderly parent — delegated authority
  | "guardian_of"      // Legal guardian (non-parent)
  | "executor_of"      // Estate executor — legal authority over deceased's affairs
  | "carer_of"         // Registered carer — limited delegated authority
  | "attorney_of"      // Power of Attorney — specific legal delegation
  | "representative_of"; // Professional representative (solicitor, advice worker)
```

### 2.2 Permission Scopes

Each relationship carries a set of permission scopes that control what the related person can do:

```typescript
type PermissionScope =
  | "view_status"      // See the status of services and applications
  | "view_data"        // See personal data fields (address, income, etc.)
  | "submit_on_behalf" // Submit applications and forms
  | "receive_alerts"   // Get notifications when something changes
  | "manage_consent"   // Grant or revoke consent for data sharing
  | "make_payments"    // Make payments (court fees, tax, etc.)
  | "appeal_decisions" // Lodge appeals or mandatory reconsiderations
  | "correspond"       // Send and receive correspondence with departments
  | "full_authority";  // All of the above (e.g., parent of minor child)
```

### 2.3 Default Permission Sets

Different relationship types carry different default permissions. These defaults can be adjusted by either party.

| Relationship | Default Permissions | Adjustable? |
|---|---|---|
| `parent_of` (minor child) | `full_authority` | Parent can restrict; child cannot override until 16 |
| `parent_of` (16-17) | `view_status`, `receive_alerts`, `submit_on_behalf` | Young person can revoke any scope |
| `spouse` | `view_status`, `receive_alerts` | Each spouse controls independently |
| `partner` | None — explicit grant only | Each partner controls independently |
| `executor_of` | `view_data`, `submit_on_behalf`, `make_payments`, `correspond` | Fixed by legal authority |
| `carer_of` | `view_status`, `receive_alerts` | Cared-for person controls |
| `attorney_of` | Per the LPA document | Fixed by legal instrument |
| `child_of` (elderly parent) | None — explicit grant only | Parent controls |

---

## 3. Data Model

### 3.1 New interfaces

Add to `packages/personal-data/src/citizen-data-model.ts`:

```typescript
/** A relationship between two citizens */
export interface FamilyRelationship {
  id: string;
  /** The person who holds this relationship (e.g., the parent) */
  fromUserId: string;
  /** The person this relationship is with (e.g., the child) */
  toUserId: string;
  /** Type of relationship */
  type: RelationshipType;
  /** Whether this relationship is legally verified or self-declared */
  verification: "verified" | "declared";
  /** Source of verification (e.g., "General Register Office", "Court Order") */
  verificationSource?: string;
  /** When the relationship was established in the system */
  createdAt: string;
  /** Whether the relationship is currently active */
  active: boolean;
  /** Permissions granted in this direction */
  permissions: DelegationPermission[];
}

/** A specific permission grant within a relationship */
export interface DelegationPermission {
  scope: PermissionScope;
  /** Who granted this permission */
  grantedBy: string;
  /** When it was granted */
  grantedAt: string;
  /** Optional expiry (e.g., Power of Attorney until a date) */
  expiresAt?: string;
  /** Whether the other party can revoke this */
  revocable: boolean;
  /** Optional restriction to specific services */
  serviceFilter?: string[];
}

/** A household grouping — connects related citizens */
export interface Household {
  id: string;
  name: string;
  members: HouseholdMemberRef[];
  createdAt: string;
}

export interface HouseholdMemberRef {
  userId: string;
  role: "primary" | "partner" | "child" | "dependent" | "other";
  joinedAt: string;
}

/** An action taken by one person on behalf of another */
export interface DelegatedAction {
  id: string;
  /** Who performed the action */
  actorUserId: string;
  /** On whose behalf */
  subjectUserId: string;
  /** The relationship that authorised this action */
  relationshipId: string;
  /** What was done */
  action: string;
  /** Which service */
  serviceId: string;
  /** Timestamp */
  performedAt: string;
  /** Whether the subject has been notified */
  subjectNotified: boolean;
  /** Notification timestamp */
  notifiedAt?: string;
}
```

### 3.2 Extend CitizenProfile

Add to the existing `CitizenProfile` interface:

```typescript
interface CitizenProfile {
  // ... existing fields ...

  /** Relationships with other citizens */
  relationships?: FamilyRelationship[];

  /** Household membership */
  householdId?: string;

  /** Delegated actions log — actions taken on behalf of this person */
  delegatedActions?: DelegatedAction[];
}
```

### 3.3 Persona JSON changes

**Split Fatima & Tomasz into two persona files:**

`data/simulated/users/fatima-nowak.json`:
```json
{
  "personaId": "fatima-nowak",
  "personaName": "Fatima Nowak",
  "description": "British-born mother of three in Luton. Managing Adam's EHCP, Kasia's FSM, and Lily's school start.",
  "householdId": "nowak-family",
  "relationships": [
    {
      "id": "rel-fn-tn",
      "fromUserId": "fatima-nowak",
      "toUserId": "tomasz-nowak",
      "type": "spouse",
      "verification": "verified",
      "verificationSource": "General Register Office",
      "active": true,
      "permissions": [
        { "scope": "view_status", "grantedBy": "fatima-nowak", "revocable": true },
        { "scope": "receive_alerts", "grantedBy": "fatima-nowak", "revocable": true }
      ]
    },
    {
      "id": "rel-fn-adam",
      "fromUserId": "fatima-nowak",
      "toUserId": "adam-nowak",
      "type": "parent_of",
      "verification": "verified",
      "active": true,
      "permissions": [
        { "scope": "full_authority", "grantedBy": "system", "revocable": false }
      ]
    },
    {
      "id": "rel-fn-kasia",
      "fromUserId": "fatima-nowak",
      "toUserId": "kasia-nowak",
      "type": "parent_of",
      "verification": "verified",
      "active": true,
      "permissions": [
        { "scope": "view_status", "grantedBy": "system", "revocable": true },
        { "scope": "submit_on_behalf", "grantedBy": "system", "revocable": true },
        { "scope": "receive_alerts", "grantedBy": "system", "revocable": true }
      ]
    }
  ]
}
```

`data/simulated/users/tomasz-nowak.json`:
```json
{
  "personaId": "tomasz-nowak",
  "personaName": "Tomasz Nowak",
  "description": "Polish-born warehouse supervisor in Luton. EU Settled Status, needs eVisa setup and EU licence exchange.",
  "householdId": "nowak-family",
  "relationships": [
    {
      "id": "rel-tn-fn",
      "fromUserId": "tomasz-nowak",
      "toUserId": "fatima-nowak",
      "type": "spouse",
      "verification": "verified",
      "active": true,
      "permissions": [
        { "scope": "view_status", "grantedBy": "tomasz-nowak", "revocable": true },
        { "scope": "receive_alerts", "grantedBy": "tomasz-nowak", "revocable": true }
      ]
    },
    {
      "id": "rel-tn-adam",
      "fromUserId": "tomasz-nowak",
      "toUserId": "adam-nowak",
      "type": "parent_of",
      "verification": "verified",
      "active": true,
      "permissions": [
        { "scope": "full_authority", "grantedBy": "system", "revocable": false }
      ]
    }
  ]
}
```

`data/simulated/households/nowak-family.json`:
```json
{
  "id": "nowak-family",
  "name": "Nowak Family",
  "members": [
    { "userId": "fatima-nowak", "role": "primary", "joinedAt": "2007-06-15" },
    { "userId": "tomasz-nowak", "role": "partner", "joinedAt": "2007-06-15" },
    { "userId": "kasia-nowak", "role": "child", "joinedAt": "2011-03-12" },
    { "userId": "adam-nowak", "role": "child", "joinedAt": "2015-01-08" },
    { "userId": "lily-nowak", "role": "child", "joinedAt": "2021-05-22" }
  ],
  "createdAt": "2007-06-15"
}
```

---

## 4. UX Patterns to Implement

### 4.1 Persona Picker

The persona picker in the citizen app should show:
- Individual personas (Fatima Nowak, Tomasz Nowak — separate entries)
- A visual indicator of household membership (e.g., a subtle link icon or "Nowak family" group label)
- When you select Fatima, her dashboard shows her own services AND her children's services she has authority over

### 4.2 Dashboard — "Acting For" View

When Fatima logs in, her dashboard should have sections:

- **Your services** — UC, Carer's Allowance, her own employment
- **Adam's services** — EHCP application (week 10), secondary transfer
- **Kasia's services** — FSM recertification, GCSE results
- **Lily's services** — Reception enrolment
- **Shared with Tomasz** — Child Benefit, household UC, council tax

Each child section should show a label like "Managing for Adam" with a delegation badge.

### 4.3 Notifications

When Tomasz submits something for Adam (e.g., responds to the school about secondary transfer), Fatima should see a notification:

> "Tomasz responded to Adam's secondary school preference form"

This is powered by the `DelegatedAction` log.

### 4.4 Permission Controls

Each person should have a settings view where they can:
- See who has access to their data and services
- Adjust permission scopes (e.g., Fatima could grant Tomasz `submit_on_behalf` for Adam's EHCP)
- Revoke permissions
- See a log of actions taken on their behalf

For minor children, the parents control permissions. For Kasia (15), she can see what her parents do but cannot revoke parental authority until she turns 16.

---

## 5. How This Applies to Other Personas

The delegation model isn't just for the Nowaks. It applies across the persona set:

| Persona | Delegation Pattern |
|---|---|
| **Sarah Okafor** | `executor_of` deceased husband David. Legal authority to act on his estate across MoJ (probate), HMRC (IHT), DWP (pension). This is a time-limited delegation that ends when the estate is settled |
| **Priya Anand** | `parent_of` Arjun (9 months) and Meera (4). Full authority for both. Partner Dev could have `spouse` relationship with mutual `view_status` |
| **James Whitfield** | `parent_of` Owen (8). Both James and wife Claire have authority over Owen's EHCP. Claire could be a separate persona or a background relationship |
| **Fatima Nowak** | `spouse` of Tomasz, `parent_of` Kasia (15), Adam (11), Lily (5). Full authority for younger two, partial for Kasia |
| **Tomasz Nowak** | `spouse` of Fatima, `parent_of` all three children. Same authority as Fatima |
| **Zara Begum** | `child_of` her parents — but she's 18, so her parents have NO automatic authority. However, her student finance application requires parental income data, which is a specific data-sharing consent (not a delegation) |

---

## 6. Changes Required by Package

### 6.1 `packages/personal-data/`

| File | Action |
|------|--------|
| `src/citizen-data-model.ts` | **MODIFY** — add `FamilyRelationship`, `DelegationPermission`, `Household`, `HouseholdMemberRef`, `DelegatedAction` interfaces. Add `relationships`, `householdId`, `delegatedActions` to `CitizenProfile` |
| `src/relationship-store.ts` | **CREATE** — CRUD operations for relationships and delegated actions. Methods: `getRelationships(userId)`, `getHousehold(householdId)`, `canActOnBehalf(actorId, subjectId, scope)`, `logDelegatedAction(action)`, `getActionsOnBehalf(subjectId)` |
| `src/index.ts` | **MODIFY** — export new types and store |

### 6.2 `data/simulated/`

| File | Action |
|------|--------|
| `users/fatima-nowak.json` | **CREATE** — Fatima as individual with `relationships` array and `growingFamily` block |
| `users/tomasz-nowak.json` | **CREATE** — Tomasz as individual with `relationships` array and `immigration` block |
| `households/nowak-family.json` | **CREATE** — household grouping for the Nowak family |
| Update other persona JSONs | **MODIFY** — add `relationships` arrays where applicable (Sarah → executor_of David, Priya → parent_of children, James → parent_of Owen) |

### 6.3 `apps/citizen/`

| File | Action |
|------|--------|
| `lib/persona-meta.ts` | **MODIFY** — split "Fatima & Tomasz Nowak" into two entries: `fatima-nowak` (#4c2c92) and `tomasz-nowak` (#7c3aed). Keep same "Growing Family" label but add "(Fatima)" and "(Tomasz)" suffixes |
| `lib/service-data.ts` | **MODIFY** — import both Nowak persona files |
| `components/Dashboard.tsx` | **MODIFY** — add "Acting For" sections when persona has `parent_of` or `executor_of` relationships. Show child services grouped under child's name |
| `components/PersonaPicker.tsx` | **MODIFY** — show household grouping visually. Fatima and Tomasz linked with "Nowak Family" label |
| `components/DelegationBadge.tsx` | **CREATE** — small UI component showing "Managing for [name]" with delegation icon |
| `components/NotificationFeed.tsx` | **MODIFY** — include delegated action notifications ("Tomasz submitted Adam's school preference") |

### 6.4 `apps/legibility-studio/`

| Area | Action |
|------|--------|
| Persona view | **ENHANCE** — show relationship graph for personas with family connections. Visual: nodes for each family member, edges labelled with relationship type and permission scopes |
| Consent audit | **ENHANCE** — distinguish between own-consent and delegated-consent in the trace log |

### 6.5 `docs/personas.html`

| Change | Action |
|--------|--------|
| Nowak persona card | **MODIFY** — split into two cards: Fatima Nowak and Tomasz Nowak. Each gets their own card with their own department tags, nightmare, and solution text. Add a visual "family link" indicator between them |
| Coverage matrix | **MODIFY** — replace single "Nowaks" row with two rows: "Fatima" and "Tomasz" |
| Scenario summary | **MODIFY** — replace single Nowak row with two rows showing which interactions each person leads |

---

## 7. Implementation Order

1. **Add relationship types and interfaces** to `citizen-data-model.ts`
2. **Create `relationship-store.ts`** with the `canActOnBehalf()` permission check
3. **Create the Nowak household JSON** and split persona files
4. **Update other persona JSONs** with relationship arrays
5. **Update persona picker** to show household grouping
6. **Update dashboard** with "Acting For" sections
7. **Add delegation badge component**
8. **Update notification feed** for delegated actions
9. **Split the Nowak card** on `personas.html` into two cards
10. **Run `npm test`** — fix breakage

---

## 8. What NOT to Change

- **The Orchestrator** — it doesn't need to understand relationships; it works with whatever persona data is loaded
- **Service artefacts** — the delegation model is citizen-side, not service-side
- **The LLM adapter** — no changes needed
- **MCP server** — no changes needed

---

## 9. Key Design Principles

1. **Each person controls their own sharing** — Fatima decides what Tomasz sees of her services, and vice versa. Mutual visibility is never automatic for adults.
2. **Children don't control parental authority** — parents have `full_authority` over minor children by default. At 16, the young person gains revocation rights.
3. **Delegation is logged** — every action taken on behalf of someone else is recorded in the `DelegatedAction` log. This is essential for the legibility studio's audit trail.
4. **Relationships are bidirectional but permissions are unidirectional** — Fatima being Tomasz's spouse doesn't mean Tomasz automatically has the same permissions Fatima granted him. Each direction is independent.
5. **Legal delegations override preferences** — an executor has legal authority regardless of the deceased's prior app settings. A Power of Attorney holder has authority as specified in the legal instrument.
