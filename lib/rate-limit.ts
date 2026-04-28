import { NextResponse } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  request: Request,
  options: {
    key: string;
    limit: number;
    windowMs: number;
  }
) {
  const identity = getClientIdentity(request);
  const bucketKey = `${options.key}:${identity}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowMs
    });
    return null;
  }

  if (bucket.count >= options.limit) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many requests. Try again soon."
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((bucket.resetAt - now) / 1000).toString()
        }
      }
    );
  }

  bucket.count += 1;
  return null;
}

function getClientIdentity(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwardedFor ??
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "local"
  );
}
