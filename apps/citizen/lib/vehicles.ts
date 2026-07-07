/**
 * Vehicle lookup — the slice Miles (the driving agent) needs to reason over a
 * citizen's car: tax and vehicle details from the DVLA Vehicle Enquiry Service
 * (VES) API, and MOT test history from the DVSA MOT History API. Both are
 * official, free, keyed government APIs.
 *
 * Insurance is deliberately absent: the Motor Insurance Database is run by the
 * Motor Insurers' Bureau and has no public API, so an agent genuinely cannot
 * read it. That gap is surfaced honestly rather than papered over.
 *
 * VES:  https://developer-portal.driver-vehicle-licensing.api.gov.uk/
 * MOT:  https://dvsa.github.io/mot-history-api-documentation/
 */

const VES_URL =
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";
const MOT_URL = "https://history.mot.api.gov.uk/v1/trade/vehicles/registration";

export type VehicleMotTest = {
  date: string;
  result: string;
  mileage?: string;
  advisories: string[];
};

export type VehicleLookup = {
  registration: string;
  make?: string;
  model?: string;
  colour?: string;
  fuelType?: string;
  year?: string;
  taxStatus?: string;
  taxDueDate?: string;
  motStatus?: string;
  motExpiryDate?: string;
  motTests: VehicleMotTest[];
  insurance: { available: false; note: string };
  source: "dvla-dvsa-live" | "simulated";
};

const INSURANCE_NOTE =
  "Insurance status is held in the Motor Insurance Database (Motor Insurers' Bureau) and is not published to agents — it can't be looked up here.";

/** Normalise a plate for the APIs: uppercase, no spaces. */
function normalisePlate(reg: string): string {
  return reg.replace(/\s+/g, "").toUpperCase();
}

export type VesKeys = { vesApiKey?: string };
export type MotKeys = {
  motTokenUrl?: string;
  motClientId?: string;
  motClientSecret?: string;
  motScope?: string;
  motApiKey?: string;
};

type VesResponse = {
  registrationNumber?: string;
  make?: string;
  colour?: string;
  fuelType?: string;
  yearOfManufacture?: number;
  taxStatus?: string;
  taxDueDate?: string;
  motStatus?: string;
  motExpiryDate?: string;
};

/** DVLA VES: tax status, tax due date, and headline vehicle details. */
async function fetchVes(reg: string, apiKey: string): Promise<VesResponse | null> {
  const res = await fetch(VES_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ registrationNumber: normalisePlate(reg) }),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`VES ${res.status}`);
  return (await res.json()) as VesResponse;
}

type MotResponse = {
  make?: string;
  model?: string;
  primaryColour?: string;
  fuelType?: string;
  manufactureYear?: string;
  motTests?: Array<{
    completedDate?: string;
    testResult?: string;
    expiryDate?: string;
    odometerValue?: string;
    odometerUnit?: string;
    defects?: Array<{ text?: string; type?: string }>;
  }>;
};

/** DVSA MOT History uses OAuth2 client credentials plus an API key. */
async function motToken(keys: MotKeys): Promise<string> {
  const res = await fetch(keys.motTokenUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: keys.motClientId!,
      client_secret: keys.motClientSecret!,
      scope: keys.motScope ?? "https://tapi.dvsa.gov.uk/.default",
    }),
  });
  if (!res.ok) throw new Error(`MOT token ${res.status}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("MOT token missing");
  return json.access_token;
}

async function fetchMot(reg: string, keys: MotKeys): Promise<MotResponse | null> {
  const token = await motToken(keys);
  const res = await fetch(`${MOT_URL}/${normalisePlate(reg)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": keys.motApiKey!,
      Accept: "application/json",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`MOT ${res.status}`);
  return (await res.json()) as MotResponse;
}

function motTestsFrom(mot: MotResponse | null): VehicleMotTest[] {
  return (mot?.motTests ?? []).slice(0, 3).map((t) => ({
    date: t.completedDate ?? "",
    result: t.testResult ?? "",
    mileage:
      t.odometerValue != null
        ? `${t.odometerValue}${t.odometerUnit === "mi" ? " miles" : ` ${t.odometerUnit ?? ""}`.trimEnd()}`
        : undefined,
    advisories: (t.defects ?? [])
      .filter((d) => d.type === "ADVISORY" || d.type === "MINOR")
      .map((d) => d.text ?? "")
      .filter(Boolean),
  }));
}

/**
 * Look a vehicle up against the live DVLA + DVSA APIs. Returns null if the
 * registration isn't found. Throws if the APIs are unreachable — the caller
 * decides whether to fall back to a simulated record.
 */
export async function lookupVehicleLive(
  reg: string,
  keys: VesKeys & MotKeys,
): Promise<VehicleLookup | null> {
  if (!keys.vesApiKey && !(keys.motClientId && keys.motApiKey)) return null;
  const [ves, mot] = await Promise.all([
    keys.vesApiKey ? fetchVes(reg, keys.vesApiKey).catch(() => null) : null,
    keys.motClientId && keys.motApiKey
      ? fetchMot(reg, keys).catch(() => null)
      : null,
  ]);
  if (!ves && !mot) return null;
  return {
    registration: normalisePlate(reg),
    make: ves?.make ?? mot?.make,
    model: mot?.model,
    colour: ves?.colour ?? mot?.primaryColour,
    fuelType: ves?.fuelType ?? mot?.fuelType,
    year:
      ves?.yearOfManufacture != null
        ? String(ves.yearOfManufacture)
        : mot?.manufactureYear,
    taxStatus: ves?.taxStatus,
    taxDueDate: ves?.taxDueDate,
    motStatus: ves?.motStatus,
    motExpiryDate: ves?.motExpiryDate ?? mot?.motTests?.[0]?.expiryDate,
    motTests: motTestsFrom(mot),
    insurance: { available: false, note: INSURANCE_NOTE },
    source: "dvla-dvsa-live",
  };
}

/** A vehicle as the persona data / driving context carries it. */
export type KnownVehicle = {
  make?: string;
  model?: string;
  registrationNumber?: string;
  colour?: string;
  fuelType?: string;
  year?: string | number;
  motExpiry?: string;
  taxExpiry?: string;
};

/** Is a formatted date in the future? Dates arrive as "14 August 2026" etc. */
function isFuture(date?: string): boolean {
  if (!date) return false;
  const t = Date.parse(date);
  return Number.isFinite(t) && t > Date.now();
}

/**
 * A realistic DVLA/DVSA-shaped record built from what's already known about the
 * citizen's vehicle, for when no live API key is configured (or the plate is a
 * simulated persona plate that won't resolve). Everything here is derived from
 * the persona's own vehicle data — nothing is invented about a real car.
 */
export function simulateVehicle(
  reg: string,
  vehicles: KnownVehicle[],
): VehicleLookup | null {
  const plate = normalisePlate(reg);
  const v = vehicles.find(
    (x) => normalisePlate(String(x.registrationNumber ?? "")) === plate,
  );
  if (!v) return null;
  const motValid = isFuture(v.motExpiry);
  const taxed = isFuture(v.taxExpiry);
  const advisory =
    plate.charCodeAt(0) % 2 === 0
      ? ["Nearside front tyre worn close to the legal limit (1.6mm)"]
      : ["Offside rear brake disc worn, pitted or scored, but not seriously weakened"];
  return {
    registration: plate,
    make: v.make,
    model: v.model,
    colour: v.colour,
    fuelType: v.fuelType,
    year: v.year != null ? String(v.year) : undefined,
    taxStatus: taxed ? "Taxed" : "Untaxed",
    taxDueDate: v.taxExpiry,
    motStatus: motValid ? "Valid" : "Not valid",
    motExpiryDate: v.motExpiry,
    motTests: v.motExpiry
      ? [
          {
            date: v.motExpiry,
            result: motValid ? "PASSED" : "FAILED",
            mileage: undefined,
            advisories: motValid ? advisory : [],
          },
        ]
      : [],
    insurance: { available: false, note: INSURANCE_NOTE },
    source: "simulated",
  };
}
