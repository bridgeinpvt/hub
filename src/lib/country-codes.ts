export interface CountryCode {
  code: string;        // Country code without + (e.g., "91", "1")
  country: string;     // Country name (e.g., "India", "United States")
  iso: string;         // ISO country code (e.g., "IN", "US")
  flag: string;        // Unicode flag emoji
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "1", country: "United States", iso: "US", flag: "🇺🇸" },
  { code: "1", country: "Canada", iso: "CA", flag: "🇨🇦" },
  { code: "91", country: "India", iso: "IN", flag: "🇮🇳" },
  { code: "44", country: "United Kingdom", iso: "GB", flag: "🇬🇧" },
  { code: "86", country: "China", iso: "CN", flag: "🇨🇳" },
  { code: "81", country: "Japan", iso: "JP", flag: "🇯🇵" },
  { code: "49", country: "Germany", iso: "DE", flag: "🇩🇪" },
  { code: "33", country: "France", iso: "FR", flag: "🇫🇷" },
  { code: "39", country: "Italy", iso: "IT", flag: "🇮🇹" },
  { code: "34", country: "Spain", iso: "ES", flag: "🇪🇸" },
  { code: "7", country: "Russia", iso: "RU", flag: "🇷🇺" },
  { code: "55", country: "Brazil", iso: "BR", flag: "🇧🇷" },
  { code: "61", country: "Australia", iso: "AU", flag: "🇦🇺" },
  { code: "82", country: "South Korea", iso: "KR", flag: "🇰🇷" },
  { code: "65", country: "Singapore", iso: "SG", flag: "🇸🇬" },
  { code: "60", country: "Malaysia", iso: "MY", flag: "🇲🇾" },
  { code: "66", country: "Thailand", iso: "TH", flag: "🇹🇭" },
  { code: "84", country: "Vietnam", iso: "VN", flag: "🇻🇳" },
  { code: "62", country: "Indonesia", iso: "ID", flag: "🇮🇩" },
  { code: "63", country: "Philippines", iso: "PH", flag: "🇵🇭" },
  { code: "92", country: "Pakistan", iso: "PK", flag: "🇵🇰" },
  { code: "880", country: "Bangladesh", iso: "BD", flag: "🇧🇩" },
  { code: "94", country: "Sri Lanka", iso: "LK", flag: "🇱🇰" },
  { code: "977", country: "Nepal", iso: "NP", flag: "🇳🇵" },
  { code: "27", country: "South Africa", iso: "ZA", flag: "🇿🇦" },
  { code: "20", country: "Egypt", iso: "EG", flag: "🇪🇬" },
  { code: "234", country: "Nigeria", iso: "NG", flag: "🇳🇬" },
  { code: "254", country: "Kenya", iso: "KE", flag: "🇰🇪" },
  { code: "971", country: "United Arab Emirates", iso: "AE", flag: "🇦🇪" },
  { code: "966", country: "Saudi Arabia", iso: "SA", flag: "🇸🇦" },
  { code: "98", country: "Iran", iso: "IR", flag: "🇮🇷" },
  { code: "90", country: "Turkey", iso: "TR", flag: "🇹🇷" },
  { code: "52", country: "Mexico", iso: "MX", flag: "🇲🇽" },
  { code: "54", country: "Argentina", iso: "AR", flag: "🇦🇷" },
  { code: "56", country: "Chile", iso: "CL", flag: "🇨🇱" },
  { code: "57", country: "Colombia", iso: "CO", flag: "🇨🇴" },
  { code: "51", country: "Peru", iso: "PE", flag: "🇵🇪" },
  { code: "58", country: "Venezuela", iso: "VE", flag: "🇻🇪" },
];

// Popular countries first
export const POPULAR_COUNTRIES = ["US", "IN", "GB", "CA", "AU", "DE", "FR", "SG"];

// Utility functions
export function getCountryByCode(code: string): CountryCode | undefined {
  return COUNTRY_CODES.find(c => c.code === code);
}

export function getCountryByISO(iso: string): CountryCode | undefined {
  return COUNTRY_CODES.find(c => c.iso === iso);
}

export function formatPhoneWithCountry(countryCode: string, phoneNumber: string): string {
  // Add + for display purposes
  return `+${countryCode} ${phoneNumber}`;
}

export function parsePhoneNumber(fullPhoneNumber: string): { countryCode: string; phoneNumber: string } | null {
  // Remove all non-digits and spaces
  const cleaned = fullPhoneNumber.replace(/[^\d]/g, '');
  
  if (!cleaned) return null;
  
  // Try to match with known country codes (longest first)
  const sortedCodes = COUNTRY_CODES
    .map(c => c.code)
    .sort((a, b) => b.length - a.length);
  
  for (const code of sortedCodes) {
    if (cleaned.startsWith(code)) {
      return {
        countryCode: code,
        phoneNumber: cleaned.substring(code.length)
      };
    }
  }
  
  // Default to US if no match found
  return {
    countryCode: "1",
    phoneNumber: cleaned
  };
}

export function validatePhoneNumber(countryCode: string, phoneNumber: string): boolean {
  // Remove all non-digits
  const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
  
  // Basic validation - phone number should have at least 7 digits
  if (cleanPhone.length < 7) return false;
  
  // Country-specific validations
  switch (countryCode) {
    case "1": // US/Canada
      return cleanPhone.length === 10;
    case "91": // India
      return cleanPhone.length === 10;
    case "44": // UK
      return cleanPhone.length >= 10 && cleanPhone.length <= 11;
    case "86": // China
      return cleanPhone.length === 11;
    case "81": // Japan
      return cleanPhone.length >= 10 && cleanPhone.length <= 11;
    case "49": // Germany
      return cleanPhone.length >= 10 && cleanPhone.length <= 12;
    case "33": // France
      return cleanPhone.length === 9;
    case "65": // Singapore
      return cleanPhone.length === 8;
    case "61": // Australia
      return cleanPhone.length === 9;
    default:
      // General validation for other countries
      return cleanPhone.length >= 7 && cleanPhone.length <= 15;
  }
}

export function getPopularCountries(): CountryCode[] {
  return POPULAR_COUNTRIES.map(iso => getCountryByISO(iso)!).filter(Boolean);
}

export function getAllCountries(): CountryCode[] {
  return COUNTRY_CODES.sort((a, b) => a.country.localeCompare(b.country));
}