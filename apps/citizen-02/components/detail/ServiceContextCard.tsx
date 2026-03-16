"use client";

import type { PersonaData } from "@/lib/types";

interface DataRow {
  label: string;
  value: string;
}

function buildRows(service: string, data: PersonaData): DataRow[] {
  const raw = data as unknown as Record<string, unknown>;
  const rows: DataRow[] = [];

  switch (service) {
    case "employment": {
      const emp = data.employment as Record<string, unknown> | undefined;
      // Employment may be nested under persona name — find the first entry with a status
      const entries = emp
        ? (Object.values(emp).filter(
            (v) =>
              v &&
              typeof v === "object" &&
              "status" in (v as Record<string, unknown>),
          ) as Array<Record<string, unknown>>)
        : [];
      // Show all household members' employment
      for (const entry of entries.length > 0 ? entries : emp ? [emp] : []) {
        const name = (entry as Record<string, unknown>).employer;
        if (name) rows.push({ label: "Employer", value: String(name) });
        const title = (entry as Record<string, unknown>).jobTitle;
        if (title) rows.push({ label: "Role", value: String(title) });
        const income = (entry as Record<string, unknown>).annualIncome;
        if (income)
          rows.push({
            label: "Salary",
            value: `£${Number(income).toLocaleString("en-GB")}`,
          });
        const start = (entry as Record<string, unknown>).startDate;
        if (start) {
          try {
            rows.push({
              label: "Started",
              value: new Date(String(start)).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              }),
            });
          } catch {
            /* skip */
          }
        }
        const taxCode = (entry as Record<string, unknown>).taxCode;
        if (taxCode) rows.push({ label: "Tax code", value: String(taxCode) });
        // Only show first person's details if multiple
        if (entries.length > 1 && rows.length > 0) break;
      }
      // Also show NI number from primaryContact
      if (data.primaryContact?.nationalInsuranceNumber) {
        rows.push({
          label: "NI number",
          value: data.primaryContact.nationalInsuranceNumber,
        });
      }
      // Status from top level
      const status = raw.employment_status as string | undefined;
      if (status && rows.length === 0) {
        rows.push({ label: "Status", value: status });
      }
      break;
    }

    case "driving": {
      if (data.vehicles) {
        for (const v of data.vehicles) {
          rows.push({
            label: "Vehicle",
            value: `${v.make} ${v.model} (${v.year})`,
          });
          rows.push({ label: "Registration", value: v.registrationNumber });
          if (v.motExpiry) {
            rows.push({
              label: "MOT expires",
              value: new Date(v.motExpiry).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            });
          }
          if (v.taxExpiry) {
            rows.push({
              label: "Tax expires",
              value: new Date(v.taxExpiry).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            });
          }
          // Only show first vehicle in summary
          break;
        }
        if (data.vehicles.length > 1) {
          rows.push({
            label: "Vehicles",
            value: `${data.vehicles.length} registered`,
          });
        }
      }
      // Driving licence from credentials
      const creds = raw.credentials as
        | Array<Record<string, unknown>>
        | undefined;
      const dl = creds?.find((c) => c.type === "driving-licence");
      if (dl?.number) {
        rows.push({ label: "Licence", value: String(dl.number) });
      }
      break;
    }

    case "benefits": {
      if (data.benefits?.currentlyReceiving) {
        for (const b of data.benefits.currentlyReceiving) {
          rows.push({ label: b.type, value: `£${b.amount}/${b.frequency}` });
        }
      }
      if (
        data.benefits?.potentiallyEligibleFor &&
        data.benefits.potentiallyEligibleFor.length > 0
      ) {
        rows.push({
          label: "May be eligible",
          value: data.benefits.potentiallyEligibleFor.slice(0, 3).join(", "),
        });
      }
      if (data.primaryContact?.nationalInsuranceNumber) {
        rows.push({
          label: "NI number",
          value: data.primaryContact.nationalInsuranceNumber,
        });
      }
      break;
    }

    case "money": {
      const fin = data.financials as Record<string, unknown> | undefined;
      if (fin) {
        const income =
          fin.combinedAnnualIncome ?? fin.annualIncome ?? raw.income;
        if (income)
          rows.push({
            label: "Annual income",
            value: `£${Number(income).toLocaleString("en-GB")}`,
          });
        const mortgage = fin.monthlyMortgage;
        if (mortgage)
          rows.push({
            label: "Monthly mortgage",
            value: `£${Number(mortgage).toLocaleString("en-GB")}`,
          });
        const ctBand = fin.councilTaxBand;
        if (ctBand)
          rows.push({ label: "Council tax band", value: String(ctBand) });
        const sp = fin.statePension as Record<string, unknown> | undefined;
        if (sp?.weeklyAmount)
          rows.push({
            label: "State Pension",
            value: `£${sp.weeklyAmount}/week`,
          });
        // Bank
        const ca = fin.currentAccount as Record<string, unknown> | undefined;
        if (ca?.bank) rows.push({ label: "Bank", value: String(ca.bank) });
      }
      if (data.primaryContact?.nationalInsuranceNumber) {
        rows.push({
          label: "NI number",
          value: data.primaryContact.nationalInsuranceNumber,
        });
      }
      break;
    }

    case "health": {
      const hi = data.healthInfo as Record<string, unknown> | undefined;
      if (hi) {
        // May be nested by name — find first entry with gpSurgery
        const entries = Object.values(hi).filter(
          (v) =>
            v &&
            typeof v === "object" &&
            "gpSurgery" in (v as Record<string, unknown>),
        ) as Array<Record<string, unknown>>;
        const entry = entries[0] ?? hi;
        if (entry.gpSurgery)
          rows.push({ label: "GP surgery", value: String(entry.gpSurgery) });
        if (entry.nhsNumber)
          rows.push({ label: "NHS number", value: String(entry.nhsNumber) });
        const conditions = entry.conditions as string[] | undefined;
        if (conditions && conditions.length > 0)
          rows.push({ label: "Conditions", value: conditions.join(", ") });
        const meds = entry.medications as string[] | undefined;
        if (meds && meds.length > 0)
          rows.push({ label: "Medications", value: meds.join(", ") });
      }
      if (data.pregnancy?.hospital) {
        rows.push({ label: "Hospital", value: data.pregnancy.hospital });
      }
      if (data.pregnancy?.dueDate) {
        rows.push({
          label: "Baby due",
          value: new Date(data.pregnancy.dueDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        });
      }
      break;
    }

    case "parenting": {
      if (data.pregnancy?.dueDate) {
        rows.push({
          label: "Baby due",
          value: new Date(data.pregnancy.dueDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        });
        if (data.pregnancy.hospital)
          rows.push({ label: "Hospital", value: data.pregnancy.hospital });
      }
      // Children — from top-level or family.children
      const children =
        data.children ??
        ((data.family as Record<string, unknown> | undefined)?.children as
          | Array<Record<string, unknown>>
          | undefined);
      if (Array.isArray(children)) {
        for (const child of children) {
          const name = `${child.firstName} ${child.lastName || ""}`.trim();
          const dob = child.dateOfBirth as string | undefined;
          if (dob) {
            const age = Math.floor(
              (Date.now() - new Date(dob).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            );
            rows.push({
              label: name,
              value: age < 1 ? "Under 1" : `Age ${age}`,
            });
          } else {
            rows.push({ label: "Child", value: name });
          }
        }
      }
      // Partner
      const partner =
        data.partner ?? (raw.spouse as Record<string, unknown> | undefined);
      if (partner) {
        rows.push({
          label: "Partner",
          value: `${partner.firstName} ${partner.lastName || ""}`.trim(),
        });
      }
      break;
    }

    case "travel": {
      const creds = raw.credentials as
        | Array<Record<string, unknown>>
        | undefined;
      if (creds) {
        const passport = creds.find(
          (c) => c.type === "passport" || c.type === "british-passport",
        );
        if (passport) {
          rows.push({
            label: "Passport",
            value: String(passport.number ?? "Valid"),
          });
          if (passport.expires) {
            rows.push({
              label: "Passport expires",
              value: new Date(String(passport.expires)).toLocaleDateString(
                "en-GB",
                { day: "numeric", month: "short", year: "numeric" },
              ),
            });
          }
          if (passport.status) {
            rows.push({ label: "Status", value: String(passport.status) });
          }
        } else {
          rows.push({ label: "Passport", value: "Not on file" });
        }
        const dl = creds.find((c) => c.type === "driving-licence");
        if (dl) {
          rows.push({
            label: "Driving licence",
            value: String(dl.number ?? "Valid"),
          });
          if (dl.expires) {
            rows.push({
              label: "Licence expires",
              value: new Date(String(dl.expires)).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            });
          }
        }
      }
      // Address — handle both line1 and line_1 formats
      const addr =
        data.address ?? (raw.address as Record<string, unknown> | undefined);
      if (addr) {
        const line1 =
          (addr as Record<string, unknown>).line1 ??
          (addr as Record<string, unknown>).line_1;
        const line2 =
          (addr as Record<string, unknown>).line2 ??
          (addr as Record<string, unknown>).line_2;
        const city = (addr as Record<string, unknown>).city;
        const postcode = (addr as Record<string, unknown>).postcode;
        const parts = [line1, line2, city, postcode]
          .filter(Boolean)
          .map(String);
        if (parts.length > 0)
          rows.push({ label: "Address", value: parts.join(", ") });
      }
      break;
    }

    case "business": {
      const emp = data.employment as Record<string, unknown> | undefined;
      const entries = emp
        ? (Object.values(emp).filter(
            (v) =>
              v &&
              typeof v === "object" &&
              "status" in (v as Record<string, unknown>),
          ) as Array<Record<string, unknown>>)
        : [];
      const selfEmp = entries.find((e) => {
        const s = String(e.status ?? "").toLowerCase();
        return s === "self-employed";
      });
      if (selfEmp) {
        if (selfEmp.businessName)
          rows.push({ label: "Business", value: String(selfEmp.businessName) });
        if (selfEmp.annualIncome)
          rows.push({
            label: "Income",
            value: `£${Number(selfEmp.annualIncome).toLocaleString("en-GB")}`,
          });
      }
      if (data.primaryContact?.nationalInsuranceNumber) {
        rows.push({
          label: "NI number",
          value: data.primaryContact.nationalInsuranceNumber,
        });
      }
      break;
    }

    case "care": {
      const family = data.family as Record<string, unknown> | undefined;
      const dependents = family?.dependents as
        | Array<Record<string, unknown>>
        | undefined;
      if (Array.isArray(dependents)) {
        for (const dep of dependents) {
          const name = `${dep.firstName} ${dep.lastName || ""}`.trim();
          const rel = dep.relationship ? ` (${dep.relationship})` : "";
          rows.push({ label: "Dependent", value: `${name}${rel}` });
        }
      }
      if (raw.powerOfAttorney) {
        rows.push({ label: "Power of Attorney", value: "Registered" });
      }
      break;
    }

    case "retirement": {
      const fin = data.financials as Record<string, unknown> | undefined;
      const sp = fin?.statePension as Record<string, unknown> | undefined;
      if (sp) {
        if (sp.weeklyAmount)
          rows.push({ label: "Weekly amount", value: `£${sp.weeklyAmount}` });
        if (sp.type) rows.push({ label: "Type", value: String(sp.type) });
      }
      if (data.primaryContact?.dateOfBirth) {
        const dob = new Date(data.primaryContact.dateOfBirth);
        const age = Math.floor(
          (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        );
        rows.push({ label: "Age", value: String(age) });
      }
      if (data.primaryContact?.nationalInsuranceNumber) {
        rows.push({
          label: "NI number",
          value: data.primaryContact.nationalInsuranceNumber,
        });
      }
      break;
    }

    case "studying": {
      const edu = raw.education as Record<string, unknown> | undefined;
      if (edu) {
        if (edu.institution)
          rows.push({ label: "Institution", value: String(edu.institution) });
        if (edu.course)
          rows.push({ label: "Course", value: String(edu.course) });
        if (edu.startDate)
          rows.push({ label: "Start date", value: String(edu.startDate) });
      }
      break;
    }
  }

  return rows;
}

interface ServiceContextCardProps {
  service: string;
  serviceName: string;
  personaData: PersonaData;
}

export function ServiceContextCard({
  service,
  serviceName,
  personaData,
}: ServiceContextCardProps) {
  const rows = buildRows(service, personaData);

  if (rows.length === 0) return null;

  return (
    <div className="bg-white rounded-card shadow-sm p-4 mb-5">
      <h3 className="text-xs font-bold text-govuk-dark-grey uppercase tracking-wide mb-3">
        Your {serviceName.toLowerCase()} details
      </h3>
      <div className="divide-y divide-gray-100">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between py-2 first:pt-0 last:pb-0"
          >
            <span className="text-sm text-govuk-dark-grey">{row.label}</span>
            <span className="text-sm font-medium text-govuk-black text-right ml-4">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
