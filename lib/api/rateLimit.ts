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

/**
 * Separate bucket from `rateLimitGenerate`: MCQ label formatting fires many small
 * requests in one burst when building a challenge session (one per option).
 * Defaults are higher so a typical deck does not trip 429 while other generate
 * routes keep the stricter shared limit.
 *
 * Env: FORMAT_MCQ_RATE_LIMIT_MAX (default 120), FORMAT_MCQ_RATE_LIMIT_WINDOW_MS (default 60000).
 */
export function rateLimitFormatMcqAnswer(req: Request): NextResponse | null {
  const max = Number(process.env.FORMAT_MCQ_RATE_LIMIT_MAX ?? "120");
  const windowMs = Number(
    process.env.FORMAT_MCQ_RATE_LIMIT_WINDOW_MS ?? "60000",
  );
  const limit = Number.isFinite(max) && max > 0 ? max : 120;
  const window = Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000;

  const now = Date.now();
  if (buckets.size > 5000) prune(now);

  const key = `format-mcq:${clientKey(req)}`;
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
          "Too many MCQ format requests. Please wait a minute and try again.",
      },
      { status: 429 },
    );
  }

  return null;
}

/**
 * Separate bucket for simulation conversation endpoints so chat turns do not
 * consume the shared generation quota used by /api/generate and challenge prep.
 *
 * Env: SIMULATION_RATE_LIMIT_MAX (default 90), SIMULATION_RATE_LIMIT_WINDOW_MS (default 60000).
 */
export function rateLimitSimulation(req: Request): NextResponse | null {
  const max = Number(process.env.SIMULATION_RATE_LIMIT_MAX ?? "90");
  const windowMs = Number(
    process.env.SIMULATION_RATE_LIMIT_WINDOW_MS ?? "60000",
  );
  const limit = Number.isFinite(max) && max > 0 ? max : 90;
  const window = Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000;

  const now = Date.now();
  if (buckets.size > 5000) prune(now);

  const key = `simulation:${clientKey(req)}`;
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
          "Too many simulation requests. Please wait a minute and try again.",
      },
      { status: 429 },
    );
  }

  return null;
}

/**
 * Role inference for simulation (one call per session).
 *
 * Env: INFER_ROLE_RATE_LIMIT_MAX (default 40), INFER_ROLE_RATE_LIMIT_WINDOW_MS (default 60000).
 */
export function rateLimitInferRole(req: Request): NextResponse | null {
  const max = Number(process.env.INFER_ROLE_RATE_LIMIT_MAX ?? "40");
  const windowMs = Number(
    process.env.INFER_ROLE_RATE_LIMIT_WINDOW_MS ?? "60000",
  );
  const limit = Number.isFinite(max) && max > 0 ? max : 40;
  const window = Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000;

  const now = Date.now();
  if (buckets.size > 5000) prune(now);

  const key = `infer-role:${clientKey(req)}`;
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
          "Too many role inference requests. Please wait a minute and try again.",
      },
      { status: 429 },
    );
  }

  return null;
}
