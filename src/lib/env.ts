// Server-side environment access. Never import this from client components.
import "server-only";

type ProductProvider = "mock" | "serpapi";
type MapProvider = "mock" | "google";
type OfferProvider = "mock" | "awin";
type DataMode = "local" | "supabase";

function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  const v = (value ?? "").trim().toLowerCase();
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export const env = {
  /**
   * "Production" for the mock-refusal rule means a real deployment with real user data
   * (Supabase mode). Local demo mode always labels mock data and is never Arielle's live app.
   */
  get isProduction() {
    return process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview" && process.env.ALLOW_MOCK_IN_PRODUCTION !== "true" && this.dataMode === "supabase";
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  },
  get dataMode(): DataMode {
    const explicit = pick(process.env.DATA_MODE, ["local", "supabase"] as const, "local");
    if (explicit === "supabase" && !process.env.NEXT_PUBLIC_SUPABASE_URL) return "local";
    return explicit;
  },
  get localDataDir() {
    // Serverless filesystems are read-only except /tmp; demo data there is ephemeral by design.
    return process.env.LOCAL_DATA_DIR || (process.env.VERCEL ? "/tmp/arielle-warwick-data" : ".data");
  },
  get productProvider(): ProductProvider {
    const p = pick(process.env.PRODUCT_PROVIDER, ["mock", "serpapi"] as const, "mock");
    return p === "serpapi" && !process.env.SERPAPI_API_KEY ? "mock" : p;
  },
  get mapProvider(): MapProvider {
    const p = pick(process.env.MAP_PROVIDER, ["mock", "google"] as const, "mock");
    return p === "google" && !process.env.GOOGLE_MAPS_SERVER_API_KEY ? "mock" : p;
  },
  get offerProvider(): OfferProvider {
    const p = pick(process.env.OFFER_PROVIDER, ["mock", "awin"] as const, "mock");
    return p === "awin" && !(process.env.AWIN_PUBLISHER_ID && process.env.AWIN_ACCESS_TOKEN) ? "mock" : p;
  },
  get aiConfigured() {
    return Boolean(process.env.AI_GATEWAY_API_KEY && process.env.AI_MODEL);
  },
  get aiModel() {
    return process.env.AI_MODEL || "";
  },
  get routesEnabled() {
    return process.env.GOOGLE_ROUTES_ENABLED === "true" && Boolean(process.env.GOOGLE_MAPS_SERVER_API_KEY);
  },
  get supabase() {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      secretKey: process.env.SUPABASE_SECRET_KEY ?? "",
    };
  },
  get serpapiKey() {
    return process.env.SERPAPI_API_KEY ?? "";
  },
  get googleServerKey() {
    return process.env.GOOGLE_MAPS_SERVER_API_KEY ?? "";
  },
  get awin() {
    return { publisherId: process.env.AWIN_PUBLISHER_ID ?? "", accessToken: process.env.AWIN_ACCESS_TOKEN ?? "" };
  },
  get demoFirstName() {
    return process.env.LOCAL_DEMO_FIRST_NAME || "Arielle";
  },
};

/** Public, non-secret description of which providers are active (safe to send to the browser). */
export function providerStatus() {
  return {
    dataMode: env.dataMode,
    product: env.productProvider,
    map: env.mapProvider,
    offer: env.offerProvider,
    ai: env.aiConfigured ? "configured" : "not_configured",
    routes: env.routesEnabled,
    mapsBrowserKey: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
    mockVisible: env.productProvider === "mock" || env.mapProvider === "mock" || env.offerProvider === "mock",
  };
}
