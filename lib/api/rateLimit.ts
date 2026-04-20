import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Drop stale entries so the map does not grow forever (dev server / long uptime). */
function prune(now: number) {
  for (const [key, b] of buckets) {
    if (now > b.resetAt) buckets.delete(key);
  }
}

function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  return "unknown";
}

/**
 * Simple in-memory fixed window rate limit per client IP.
 * Fine for a single Node process; use Redis/Edge for multi-instance production.
 *
 * Env: GENERATE_RATE_LIMIT_MAX (default 30), GENERATE_RATE_LIMIT_WINDOW_MS (default 60000).
 */
export function rateLimitGenerate(req: Request): NextResponse | null {
  const max = Number(process.env.GENERATE_RATE_LIMIT_MAX ?? "30");
  const windowMs = Number(process.env.GENERATE_RATE_LIMIT_WINDOW_MS ?? "60000");
  const limit = Number.isFinite(max) && max > 0 ? max : 30;
  const window = Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000;

  const now = Date.now();
  if (buckets.size > 5000) prune(now);

  const key = clientKey(req);
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + window };
    buckets.set(key, b);
  }

  b.count += 1;
  if (b.count > limit) {
    return NextResponse.json(
      {
        error:
          "Too many generation requests. Please wait a minute and try again.",
      },
      { status: 429 },
    );
  }

  return null;
}
