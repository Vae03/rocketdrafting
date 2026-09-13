// Liquipedia infobox `country=` values are full English country/territory names. Maps the ones
// that actually occur in the RLCS player pool to ISO 3166-1 alpha-2 codes (England/Scotland/Wales
// get their own pseudo-codes since they have distinct, recognizable flags of their own -- see
// components/flag-icon.tsx, which renders these as small hand-drawn SVGs rather than Unicode flag
// emoji: emoji flags depend on OS font support that Windows browsers generally don't have, so they
// were rendering as plain two-letter text instead of a flag).
const COUNTRY_TO_ISO: Record<string, string> = {
  "United States": "US", "England": "GB-ENG", "Scotland": "GB-SCT", "Wales": "GB-WLS", "Northern Ireland": "GB",
  "United Kingdom": "GB", "Canada": "CA", "Mexico": "MX", "Brazil": "BR", "Argentina": "AR",
  "Chile": "CL", "Colombia": "CO", "Peru": "PE", "Uruguay": "UY", "Ecuador": "EC", "Bolivia": "BO",
  "Paraguay": "PY", "Venezuela": "VE", "France": "FR", "Germany": "DE", "Spain": "ES", "Italy": "IT",
  "Portugal": "PT", "Netherlands": "NL", "Belgium": "BE", "Switzerland": "CH", "Austria": "AT",
  "Sweden": "SE", "Norway": "NO", "Denmark": "DK", "Finland": "FI", "Iceland": "IS", "Ireland": "IE",
  "Poland": "PL", "Czech Republic": "CZ", "Slovakia": "SK", "Hungary": "HU", "Romania": "RO",
  "Bulgaria": "BG", "Greece": "GR", "Turkey": "TR", "Russia": "RU", "Ukraine": "UA", "Belarus": "BY",
  "Croatia": "HR", "Serbia": "RS", "Slovenia": "SI", "Bosnia and Herzegovina": "BA", "Estonia": "EE",
  "Latvia": "LV", "Lithuania": "LT", "Luxembourg": "LU", "Malta": "MT", "Cyprus": "CY", "Moldova": "MD",
  "Albania": "AL", "North Macedonia": "MK", "Montenegro": "ME", "Kosovo": "XK", "Andorra": "AD",
  "Monaco": "MC", "Liechtenstein": "LI", "San Marino": "SM",
  "Morocco": "MA", "Algeria": "DZ", "Tunisia": "TN", "Egypt": "EG", "Saudi Arabia": "SA",
  "United Arab Emirates": "AE", "Qatar": "QA", "Kuwait": "KW", "Bahrain": "BH", "Oman": "OM",
  "Jordan": "JO", "Lebanon": "LB", "Iraq": "IQ", "Israel": "IL", "Palestine": "PS", "Libya": "LY",
  "South Africa": "ZA", "Nigeria": "NG", "Kenya": "KE", "Ghana": "GH", "Ethiopia": "ET",
  "Zimbabwe": "ZW", "Uganda": "UG", "Tanzania": "TZ", "Cameroon": "CM", "Senegal": "SN",
  "China": "CN", "Japan": "JP", "South Korea": "KR", "North Korea": "KP", "India": "IN",
  "Pakistan": "PK", "Bangladesh": "BD", "Indonesia": "ID", "Philippines": "PH", "Vietnam": "VN",
  "Thailand": "TH", "Malaysia": "MY", "Singapore": "SG", "Taiwan": "TW", "Hong Kong": "HK",
  "Mongolia": "MN", "Kazakhstan": "KZ", "Uzbekistan": "UZ",
  "Australia": "AU", "New Zealand": "NZ", "Fiji": "FJ", "Papua New Guinea": "PG",
  "Jamaica": "JM", "Cuba": "CU", "Dominican Republic": "DO", "Puerto Rico": "PR", "Panama": "PA",
  "Costa Rica": "CR", "Guatemala": "GT", "Honduras": "HN", "El Salvador": "SV", "Nicaragua": "NI",
  "Trinidad and Tobago": "TT",
  "World": "UN",
};

export function countryToIso(country?: string): string | null {
  if (!country) return null;
  return COUNTRY_TO_ISO[country.trim()] ?? null;
}

// Short codes for the region badge on player cards -- same abbreviations the user already used
// themselves for the rating region order (EU>MENA>NA>SAM>OCE>APAC>SSA).
const REGION_ABBREVIATIONS: Record<string, string> = {
  "Europe": "EU",
  "Middle East and North Africa": "MENA",
  "North America": "NA",
  "South America": "SAM",
  "Oceania": "OCE",
  "Asia-Pacific": "APAC",
  "Asia-Pacific North": "APAC N",
  "Asia-Pacific South": "APAC S",
  "Asia": "ASIA",
  "Sub-Saharan Africa": "SSA",
  "Unknown": "—",
};

export function regionAbbreviation(region: string): string {
  return REGION_ABBREVIATIONS[region] ?? region.slice(0, 4).toUpperCase();
}
