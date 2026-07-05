/**
 * Companies House Public Data API — the slice Dot needs to recognise a
 * citizen from the company they mention: search by name, then pull the
 * company profile and its officers.
 *
 * Auth is HTTP Basic with the API key as username and an empty password.
 * https://developer.company-information.service.gov.uk/
 */

const BASE_URL = "https://api.company-information.service.gov.uk";

export type CompanyProfile = {
  company_name: string;
  company_number: string;
  company_status: string;
  type: string;
  date_of_creation: string;
  registered_office_address?: {
    address_line_1?: string;
    locality?: string;
    postal_code?: string;
  };
  accounts?: { next_due?: string; overdue?: boolean };
  confirmation_statement?: { next_due?: string; overdue?: boolean };
};

export type Director = {
  name: string; // "Christopher Downs"
  role: string; // "director"
  appointedOn?: string;
  active: boolean;
};

export type CompanyLookup = {
  name: string;
  number: string;
  status: string;
  incorporatedOn: string;
  officeAddress: string | null;
  confirmationStatementDue: string | null;
  accountsDue: string | null;
  directors: Director[];
};

function authHeader(apiKey: string): string {
  return `Basic ${btoa(apiKey + ":")}`;
}

async function chFetch<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: authHeader(apiKey), Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Companies House ${res.status} on ${path}: ${text}`);
  }
  return (await res.json()) as T;
}

type SearchResponse = {
  items?: Array<{
    company_number: string;
    title: string;
    company_status?: string;
  }>;
};

type OfficersResponse = {
  items?: Array<{
    name: string; // "DOWNS, Christopher"
    officer_role: string;
    appointed_on?: string;
    resigned_on?: string;
  }>;
};

/** "DOWNS, Christopher" → "Christopher Downs". Corporate names title-cased. */
function friendlyName(chName: string): string {
  const trimmed = chName.trim();
  const comma = trimmed.indexOf(",");
  if (comma === -1) return titleCase(trimmed);
  const surname = titleCase(trimmed.slice(0, comma).trim());
  const forenames = trimmed.slice(comma + 1).trim();
  return `${forenames} ${surname}`.trim();
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|[-'])/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

/**
 * Find the best-matching live company for a name the citizen typed, then
 * return its profile and directors in the compact shape Dot reasons over.
 * Returns null when nothing plausible is found.
 */
export async function lookupCompanyByName(
  apiKey: string,
  query: string,
): Promise<CompanyLookup | null> {
  const search = await chFetch<SearchResponse>(
    apiKey,
    `/search/companies?q=${encodeURIComponent(query)}&items_per_page=5`,
  );
  const candidates = search.items ?? [];
  // Prefer an active company; otherwise take the top hit.
  const pick =
    candidates.find((c) => c.company_status === "active") ?? candidates[0];
  if (!pick) return null;

  const [profile, officers] = await Promise.all([
    chFetch<CompanyProfile>(apiKey, `/company/${pick.company_number}`),
    chFetch<OfficersResponse>(
      apiKey,
      `/company/${pick.company_number}/officers?items_per_page=100`,
    ).catch(() => ({ items: [] }) as OfficersResponse),
  ]);

  const directors: Director[] = (officers.items ?? [])
    .filter((o) => o.officer_role === "director")
    .map((o) => ({
      name: friendlyName(o.name),
      role: o.officer_role,
      appointedOn: o.appointed_on,
      active: !o.resigned_on,
    }))
    .sort((a, b) => Number(b.active) - Number(a.active));

  const addr = profile.registered_office_address;
  return {
    name: profile.company_name,
    number: profile.company_number,
    status: profile.company_status,
    incorporatedOn: profile.date_of_creation,
    officeAddress: addr
      ? [addr.address_line_1, addr.locality, addr.postal_code]
          .filter(Boolean)
          .join(", ")
      : null,
    confirmationStatementDue: profile.confirmation_statement?.next_due ?? null,
    accountsDue: profile.accounts?.next_due ?? null,
    directors,
  };
}
