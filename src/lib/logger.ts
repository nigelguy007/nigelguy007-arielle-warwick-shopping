// Structured server logs. Never log secret values: callers pass only safe fields.
type Level = "debug" | "info" | "warn" | "error";

const SECRET_PATTERN = /(api[_-]?key|token|secret|authorization|password)/i;

function scrub(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = SECRET_PATTERN.test(k) ? "[redacted]" : v;
  }
  return out;
}

function emit(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...scrub(fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (process.env.NODE_ENV !== "test") console.log(line);
}

export const log = {
  debug: (event: string, fields?: Record<string, unknown>) => emit("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
};

/** In-memory provider metrics for the health endpoint (per server instance). */
const metrics = new Map<string, { success: number; failure: number; totalMs: number }>();

export async function timed<T>(provider: string, op: string, fn: () => Promise<T>): Promise<T> {
  const key = `${provider}.${op}`;
  const started = Date.now();
  const m = metrics.get(key) ?? { success: 0, failure: 0, totalMs: 0 };
  try {
    const result = await fn();
    m.success++;
    m.totalMs += Date.now() - started;
    metrics.set(key, m);
    log.info("provider.call", { provider, op, ms: Date.now() - started, ok: true });
    return result;
  } catch (err) {
    m.failure++;
    m.totalMs += Date.now() - started;
    metrics.set(key, m);
    log.error("provider.call", { provider, op, ms: Date.now() - started, ok: false, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export function metricsSnapshot() {
  const out: Record<string, { calls: number; successRate: number; avgMs: number }> = {};
  for (const [k, m] of metrics) {
    const calls = m.success + m.failure;
    out[k] = { calls, successRate: calls ? Math.round((m.success / calls) * 1000) / 1000 : 1, avgMs: calls ? Math.round(m.totalMs / calls) : 0 };
  }
  return out;
}
