import { deflateRawSync, inflateRawSync } from "node:zlib";

export const DEMO_COOKIE_PREFIX = "aw_demo_";
export const DEMO_COOKIE_COUNT = "aw_demo_n";
/** Browsers cap a single cookie around 4 KB; keep headroom for name + attributes. */
export const CHUNK_SIZE = 3600;
export const MAX_CHUNKS = 6;

export function encodeState(value: unknown): string {
  return deflateRawSync(Buffer.from(JSON.stringify(value), "utf8"), { level: 9 }).toString("base64url");
}

export function decodeState<T>(encoded: string): T | null {
  try {
    return JSON.parse(inflateRawSync(Buffer.from(encoded, "base64url")).toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function chunk(encoded: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < encoded.length; i += CHUNK_SIZE) out.push(encoded.slice(i, i + CHUNK_SIZE));
  return out;
}

/** Turns a cookie jar into the encoded string, or null when absent/incomplete. */
export function readChunks(getCookie: (name: string) => string | undefined): string | null {
  const n = Number(getCookie(DEMO_COOKIE_COUNT) ?? "0");
  if (!Number.isInteger(n) || n <= 0 || n > MAX_CHUNKS) return null;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const part = getCookie(`${DEMO_COOKIE_PREFIX}${i}`);
    if (part === undefined) return null;
    parts.push(part);
  }
  return parts.join("");
}

/** Produces the cookie writes needed to store the state (clearing stale chunks). Throws when too large. */
export function writeChunks(encoded: string): Array<{ name: string; value: string; remove?: boolean }> {
  const parts = chunk(encoded);
  if (parts.length > MAX_CHUNKS) throw new Error(`Demo state too large for cookies (${encoded.length} chars)`);
  const writes: Array<{ name: string; value: string; remove?: boolean }> = parts.map((value, i) => ({ name: `${DEMO_COOKIE_PREFIX}${i}`, value }));
  for (let i = parts.length; i < MAX_CHUNKS; i++) writes.push({ name: `${DEMO_COOKIE_PREFIX}${i}`, value: "", remove: true });
  writes.push({ name: DEMO_COOKIE_COUNT, value: String(parts.length) });
  return writes;
}
