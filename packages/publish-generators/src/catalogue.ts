import type { ServiceArtefacts, CatalogueOutput } from "./types";

/**
 * Generate Schema.org/GovernmentService JSON-LD and DCAT DataService entry.
 */
export function generateCatalogue(artefacts: ServiceArtefacts): CatalogueOutput {
  const { manifest } = artefacts;

  if (!manifest) {
    return { schemaOrg: {}, dcat: {} };
  }

  // Schema.org GovernmentService (JSON-LD)
  const schemaOrg: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    name: manifest.name,
    description: manifest.description || "",
    serviceType: manifest.serviceType || "government-service",
    provider: {
      "@type": "GovernmentOrganization",
      name: manifest.department || "UK Government",
    },
    areaServed: {
      "@type": "Country",
      name: "United Kingdom",
    },
    jurisdiction: manifest.jurisdiction || "England, Wales, Scotland",
  };

  if (manifest.govuk_url) {
    schemaOrg.url = manifest.govuk_url;
  }

  if (manifest.eligibility_summary) {
    schemaOrg.eligibilityDescription = manifest.eligibility_summary;
  }

  if (manifest.constraints?.fee) {
    schemaOrg.offers = {
      "@type": "Offer",
      price: manifest.constraints.fee,
      priceCurrency: "GBP",
    };
  }

  if (manifest.handoff?.escalation_phone) {
    schemaOrg.contactPoint = {
      "@type": "ContactPoint",
      telephone: manifest.handoff.escalation_phone,
      contactType: "customer service",
      availableLanguage: "en",
    };
    if (manifest.handoff.opening_hours) {
      schemaOrg.contactPoint.hoursAvailable = manifest.handoff.opening_hours;
    }
  }

  // DCAT DataService entry
  const dcat: Record<string, unknown> = {
    "@context": {
      dcat: "http://www.w3.org/ns/dcat#",
      dct: "http://purl.org/dc/terms/",
      foaf: "http://xmlns.com/foaf/0.1/",
    },
    "@type": "dcat:DataService",
    "dct:title": manifest.name,
    "dct:description": manifest.description || "",
    "dct:publisher": {
      "@type": "foaf:Organization",
      "foaf:name": manifest.department || "UK Government",
    },
    "dcat:servesDataset": manifest.id,
    "dcat:endpointDescription": `https://api.gov.uk/services/${manifest.id}`,
    "dct:conformsTo": "https://www.gov.uk/guidance/gds-api-technical-and-data-standards",
  };

  if (manifest.govuk_url) {
    dcat["dcat:landingPage"] = manifest.govuk_url;
  }

  return { schemaOrg, dcat };
}
