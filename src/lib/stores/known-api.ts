/**
 * Retailers with a real public product/price API - anyone else falls back to
 * a purpose-built connector (labelled "MCP" internally; the Shop screen
 * never surfaces that acronym to the student, see store-row.tsx).
 */
const KNOWN_API_RETAILERS = new Set(["amazon uk", "argos", "tesco", "john lewis", "ikea", "boots", "currys", "sainsbury's"]);

export function connectionMethodFor(retailer: string): "API" | "MCP" {
  return KNOWN_API_RETAILERS.has(retailer.trim().toLowerCase()) ? "API" : "MCP";
}
