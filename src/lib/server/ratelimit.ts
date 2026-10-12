export interface LimitResult {
  allowed: boolean;
  remaining: number;
}

export interface Limiter {
  hit(key: string): Promise<LimitResult>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function createMemoryLimiter(limit: number, now: () => number = Date.now): Limiter {
  const seen = new Map<string, { count: number; resetAt: number }>();
  return {
    async hit(key) {
      const t = now();
      let entry = seen.get(key);
      if (!entry || entry.resetAt <= t) {
        entry = { count: 0, resetAt: t + DAY_MS };
        seen.set(key, entry);
      }
      entry.count += 1;
      if (seen.size > 5000) {
        for (const [k, v] of seen) if (v.resetAt <= t) seen.delete(k);
      }
      return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
    },
  };
}

// Upstash REST: INCR then set a one-day expiry on the first hit.
export function createUpstashLimiter(url: string, token: string, limit: number, fetchImpl: typeof fetch = fetch): Limiter {
  const call = async (cmd: (string | number)[]) => {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
    });
    if (!res.ok) throw new Error("rate limit store unavailable");
    return ((await res.json()) as { result: number }).result;
  };
  return {
    async hit(key) {
      const k = `decode:${new Date().toISOString().slice(0, 10)}:${key}`;
      const count = await call(["INCR", k]);
      if (count === 1) await call(["EXPIRE", k, 90_000]);
      return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
    },
  };
}

let shared: Limiter | undefined;

export function getLimiter(): Limiter {
  if (shared) return shared;
  const limit = Number(process.env.RATE_LIMIT_PER_DAY ?? 10) || 10;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const memory = createMemoryLimiter(limit);
  if (url && token) {
    const remote = createUpstashLimiter(url, token, limit);
    // If the store is down, fall back to the per-instance limiter instead of blocking everyone.
    shared = { hit: (key) => remote.hit(key).catch(() => memory.hit(key)) };
  } else {
    shared = memory;
  }
  return shared;
}
