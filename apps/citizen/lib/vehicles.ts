/**
 * Vehicle lookup — a rich, self-contained simulation of what a driving agent
 * would see if it were wired into DVLA and DVSA. Given any registration it
 * returns a complete, coherent vehicle: description, tax, MOT history, open
 * recalls, clean-air-zone compliance, and — the smart bit — whether the
 * citizen can legally drive it on their current licence.
 *
 * It is deterministic: the same plate always returns the same car, so a
 * conversation stays consistent. UK plates encode the registration year, so
 * the generated age matches the number ("EV23 …" is a 2023 car).
 *
 * Insurance is deliberately absent: it lives in the Motor Insurance Database
 * (Motor Insurers' Bureau), which isn't published to agents. That gap is
 * surfaced honestly rather than invented.
 */

export type VehicleMotTest = {
  date: string;
  result: string;
  mileage?: string;
  advisories: string[];
};

export type VehicleLookup = {
  registration: string;
  make: string;
  model: string;
  colour: string;
  bodyType: string;
  fuelType: string;
  year: number;
  engine?: string;
  taxStatus: string;
  taxDueDate?: string;
  motStatus: string;
  motDueOrExpiry?: string;
  motTests: VehicleMotTest[];
  recall: { active: boolean; summary?: string; date?: string };
  cleanAir: { compliant: boolean; note: string };
  licence: { requiredCategory: string; canDrive: boolean; note: string };
  insurance: { available: false; note: string };
  source: "simulated";
};

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

/** The citizen's licence, as much as we know of it. */
export type LicenceContext = {
  categories?: string[];
  issuedYear?: number;
  holderAge?: number;
  expiry?: string;
};

const INSURANCE_NOTE =
  "Insurance status is held in the Motor Insurance Database (Motor Insurers' Bureau) and is not published to agents — it can't be looked up here.";

const COLOURS = [
  "Black", "White", "Silver", "Grey", "Blue", "Red",
  "Metallic Blue", "Metallic Grey", "Green", "Dark Blue",
];

type Model = {
  make: string;
  model: string;
  body: string;
  fuel: string;
  engine?: string;
  minYear?: number; // earliest plausible registration year
};

// Category B — ordinary cars. Most plates land here.
const CARS: Model[] = [
  { make: "Ford", model: "Fiesta", body: "Hatchback", fuel: "Petrol", engine: "1.0L" },
  { make: "Ford", model: "Focus", body: "Hatchback", fuel: "Petrol", engine: "1.5L" },
  { make: "Vauxhall", model: "Corsa", body: "Hatchback", fuel: "Petrol", engine: "1.2L" },
  { make: "Volkswagen", model: "Golf", body: "Hatchback", fuel: "Petrol", engine: "1.5L" },
  { make: "Volkswagen", model: "Polo", body: "Hatchback", fuel: "Petrol", engine: "1.0L" },
  { make: "Toyota", model: "Yaris", body: "Hatchback", fuel: "Hybrid", engine: "1.5L", minYear: 2012 },
  { make: "Toyota", model: "Corolla", body: "Estate", fuel: "Hybrid", engine: "1.8L", minYear: 2012 },
  { make: "Nissan", model: "Qashqai", body: "SUV", fuel: "Petrol", engine: "1.3L" },
  { make: "Nissan", model: "Leaf", body: "Hatchback", fuel: "Electric", minYear: 2019 },
  { make: "Tesla", model: "Model 3", body: "Saloon", fuel: "Electric", minYear: 2019 },
  { make: "BMW", model: "3 Series", body: "Saloon", fuel: "Diesel", engine: "2.0L" },
  { make: "BMW", model: "1 Series", body: "Hatchback", fuel: "Petrol", engine: "1.5L" },
  { make: "Audi", model: "A3", body: "Hatchback", fuel: "Diesel", engine: "2.0L" },
  { make: "Audi", model: "Q5", body: "SUV", fuel: "Diesel", engine: "2.0L" },
  { make: "Mercedes-Benz", model: "A-Class", body: "Hatchback", fuel: "Petrol", engine: "1.3L" },
  { make: "Mercedes-Benz", model: "C-Class", body: "Saloon", fuel: "Diesel", engine: "2.0L" },
  { make: "Kia", model: "Sportage", body: "SUV", fuel: "Hybrid", engine: "1.6L", minYear: 2016 },
  { make: "Hyundai", model: "Tucson", body: "SUV", fuel: "Hybrid", engine: "1.6L", minYear: 2016 },
  { make: "MINI", model: "Cooper", body: "Hatchback", fuel: "Petrol", engine: "1.5L" },
  { make: "Peugeot", model: "208", body: "Hatchback", fuel: "Petrol", engine: "1.2L" },
  { make: "Škoda", model: "Octavia", body: "Estate", fuel: "Diesel", engine: "2.0L" },
  { make: "Volvo", model: "XC40", body: "SUV", fuel: "Electric", minYear: 2020 },
  { make: "Land Rover", model: "Discovery Sport", body: "SUV", fuel: "Diesel", engine: "2.0L" },
];

// Larger and two-wheeled vehicles — the ones a car licence may not cover.
const BIG: Array<Model & { category: string }> = [
  { make: "Ford", model: "Transit Luton", body: "Box van (6.5t)", fuel: "Diesel", engine: "2.0L", category: "C1" },
  { make: "Mercedes-Benz", model: "Sprinter Luton", body: "Box van (5.0t)", fuel: "Diesel", engine: "2.1L", category: "C1" },
  { make: "Fiat", model: "Ducato Motorhome", body: "Motorhome (4.2t)", fuel: "Diesel", engine: "2.3L", category: "C1" },
];
const MINIBUS: Array<Model & { category: string }> = [
  { make: "Ford", model: "Transit 17-seat", body: "Minibus", fuel: "Diesel", engine: "2.0L", category: "D1" },
  { make: "Mercedes-Benz", model: "Sprinter 16-seat", body: "Minibus", fuel: "Diesel", engine: "2.1L", category: "D1" },
];
const BIKES: Array<Model & { category: string }> = [
  { make: "Honda", model: "CB500F", body: "Motorcycle", fuel: "Petrol", engine: "471cc", category: "A2" },
  { make: "Yamaha", model: "MT-07", body: "Motorcycle", fuel: "Petrol", engine: "689cc", category: "A" },
  { make: "Triumph", model: "Bonneville T120", body: "Motorcycle", fuel: "Petrol", engine: "1200cc", category: "A" },
];

const ADVISORIES = [
  "Nearside front tyre worn close to the legal limit (1.6mm)",
  "Offside rear brake disc worn, pitted or scored, but not seriously weakened",
  "Front brake pads wearing thin",
  "Slight oil leak from engine",
  "Windscreen washer provides insufficient washer liquid",
  "Nearside headlamp aim slightly too low",
];

const RECALLS = [
  "Airbag inflator may deploy incorrectly in a collision",
  "Brake control software requires a dealer update",
  "Fuel pump may fail without warning",
  "Seatbelt pretensioner may not activate correctly",
];

const DAY = 86_400_000;

function normalisePlate(reg: string): string {
  return reg.replace(/\s+/g, "").toUpperCase();
}

/** Deterministic PRNG (mulberry32) seeded from the plate. */
function seededRng(plate: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < plate.length; i++) {
    h ^= plate.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];

/** UK current-format plate ("EV23 RKP") encodes the registration year. */
function yearFromPlate(plate: string, thisYear: number): number | null {
  const m = plate.match(/^[A-Z]{2}(\d{2})/);
  if (!m) return null;
  const n = Number(m[1]);
  let y: number | null = null;
  if (n >= 1 && n <= 50) y = 2000 + n;
  else if (n >= 51 && n <= 99) y = 2000 + (n - 50);
  if (y == null || y > thisYear) return null;
  return y;
}

function fmt(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function cleanAirNote(fuel: string, year: number): { compliant: boolean; note: string } {
  const compliant =
    fuel === "Electric" ||
    fuel === "Hybrid" ||
    (fuel === "Petrol" && year >= 2006) ||
    (fuel === "Diesel" && year >= 2015);
  return {
    compliant,
    note: compliant
      ? "Meets the ULEZ / clean-air-zone emissions standard — no daily charge."
      : "Does not meet the ULEZ / clean-air-zone standard — a daily charge applies in affected zones.",
  };
}

function assessLicence(
  required: string,
  licence: LicenceContext | undefined,
): { requiredCategory: string; canDrive: boolean; note: string } {
  const held = new Set(licence?.categories ?? ["B", "B1", "AM"]);
  // Licences won before 1 Jan 1997 carry grandfathered C1 and D1 entitlements.
  const grandfathered =
    (licence?.issuedYear != null && licence.issuedYear < 1997) ||
    (licence?.issuedYear == null && (licence?.holderAge ?? 0) >= 48);
  if (grandfathered) {
    held.add("C1");
    held.add("D1");
  }
  if (required === "B") {
    return {
      requiredCategory: "B",
      canDrive: true,
      note: "A standard car licence (category B) covers this — you're fine to drive it.",
    };
  }
  const canDrive = held.has(required);
  const labels: Record<string, string> = {
    C1: "a category C1 (medium lorry, 3.5–7.5 tonnes) entitlement",
    D1: "a category D1 (minibus) entitlement",
    A: "a full category A motorcycle licence",
    A2: "at least a category A2 motorcycle licence",
  };
  const need = labels[required] ?? `a category ${required} entitlement`;
  return {
    requiredCategory: required,
    canDrive,
    note: canDrive
      ? `This needs ${need}, which your licence has${grandfathered ? " (grandfathered from a pre-1997 licence)" : ""} — you can drive it.`
      : `This needs ${need}, which your current licence doesn't have — you're not entitled to drive it as things stand.`,
  };
}

/** Choose the vehicle body/model, honouring a known persona car if the plate
 *  matches one, otherwise generating a coherent one from the plate. */
function chooseVehicle(
  rng: () => number,
  year: number,
  known?: KnownVehicle,
): { make: string; model: string; body: string; fuel: string; engine?: string; category: string } {
  if (known?.make && known?.model) {
    return {
      make: String(known.make),
      model: String(known.model),
      body: "Car",
      fuel: known.fuelType ? String(known.fuelType) : "Petrol",
      engine: undefined,
      category: "B",
    };
  }
  const r = rng();
  if (r > 0.97) return { ...pick(rng, BIKES) };
  if (r > 0.94) return { ...pick(rng, MINIBUS) };
  if (r > 0.87) return { ...pick(rng, BIG) };
  const eligible = CARS.filter((c) => !c.minYear || year >= c.minYear);
  const c = pick(rng, eligible.length ? eligible : CARS);
  return { ...c, category: "B" };
}

/**
 * The whole point: put in any registration, get back a made-up-but-coherent
 * vehicle and everything a smart driving agent could say about it.
 */
export function generateVehicle(
  reg: string,
  knownVehicles: KnownVehicle[] = [],
  licence?: LicenceContext,
): VehicleLookup {
  const plate = normalisePlate(reg);
  const rng = seededRng(plate);
  const now = Date.now();
  const thisYear = new Date(now).getFullYear();

  const known = knownVehicles.find(
    (v) => normalisePlate(String(v.registrationNumber ?? "")) === plate,
  );

  const year =
    (known?.year != null ? Number(known.year) : null) ??
    yearFromPlate(plate, thisYear) ??
    2014 + Math.floor(rng() * (thisYear - 2014));

  const v = chooseVehicle(rng, year, known);
  const colour = known?.colour ? String(known.colour) : pick(rng, COLOURS);
  const age = thisYear - year;

  // Tax — mostly current, occasionally a problem worth flagging.
  const taxRoll = rng();
  let taxStatus = "Taxed";
  let taxDue: Date | undefined;
  if (known?.taxExpiry) {
    const t = Date.parse(known.taxExpiry);
    taxDue = Number.isFinite(t) ? new Date(t) : undefined;
    taxStatus = taxDue && taxDue.getTime() > now ? "Taxed" : "Untaxed";
  } else if (taxRoll > 0.9) {
    taxStatus = "SORN (off road)";
  } else if (taxRoll > 0.78) {
    taxStatus = "Untaxed";
    taxDue = new Date(now - Math.floor(20 + rng() * 90) * DAY);
  } else {
    taxDue = new Date(now + Math.floor(15 + rng() * 320) * DAY);
  }

  // MOT — exempt under 3 years old, otherwise a real-looking history.
  let motStatus: string;
  let motDate: Date | undefined;
  const motTests: VehicleMotTest[] = [];
  if (known?.motExpiry) {
    const t = Date.parse(known.motExpiry);
    motDate = Number.isFinite(t) ? new Date(t) : undefined;
    motStatus = motDate && motDate.getTime() > now ? "Valid" : "Expired";
  } else if (age < 3) {
    const firstDue = new Date(new Date(year, 2, 1).getTime() + 3 * 365 * DAY);
    motStatus = "Not required yet";
    motDate = firstDue;
  } else {
    const expired = rng() > 0.85;
    motDate = expired
      ? new Date(now - Math.floor(10 + rng() * 120) * DAY)
      : new Date(now + Math.floor(20 + rng() * 320) * DAY);
    motStatus = expired ? "Expired" : "Valid";
  }
  if (age >= 3) {
    const baseMiles = Math.floor(age * (6000 + rng() * 5000));
    for (let i = 0; i < 2; i++) {
      const when = new Date((motDate?.getTime() ?? now) - (i + 1) * 365 * DAY);
      if (when.getFullYear() < year) break;
      const miles = Math.max(0, baseMiles - i * Math.floor(6000 + rng() * 3000));
      const adv: string[] = [];
      const nAdv = Math.floor(rng() * 3);
      for (let k = 0; k < nAdv; k++) adv.push(pick(rng, ADVISORIES));
      motTests.push({
        date: fmt(when),
        result: i === 0 && motStatus === "Expired" ? "FAILED" : "PASSED",
        mileage: `${miles.toLocaleString("en-GB")} miles`,
        advisories: Array.from(new Set(adv)),
      });
    }
  }

  const recallActive = rng() > 0.8;
  const recall = recallActive
    ? {
        active: true,
        summary: pick(rng, RECALLS),
        date: fmt(new Date(now - Math.floor(60 + rng() * 600) * DAY)),
      }
    : { active: false };

  return {
    registration: plate,
    make: v.make,
    model: v.model,
    colour,
    bodyType: v.body,
    fuelType: v.fuel,
    year,
    engine: v.engine,
    taxStatus,
    taxDueDate: taxDue ? fmt(taxDue) : undefined,
    motStatus,
    motDueOrExpiry: motDate ? fmt(motDate) : undefined,
    motTests,
    recall,
    cleanAir: cleanAirNote(v.fuel, year),
    licence: assessLicence(v.category, licence),
    insurance: { available: false, note: INSURANCE_NOTE },
    source: "simulated",
  };
}
