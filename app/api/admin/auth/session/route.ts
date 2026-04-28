import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession } from "@/lib/admin-auth";
import { isValidStacksWallet } from "@/lib/claims";
import { rateLimit } from "@/lib/rate-limit";

const sessionSchema = z.object({
  wallet: z.string().min(20),
  message: z.string().min(1),
  signature: z.string().min(1),
  publicKey: z.string().min(1)
});

export async function POST(request: Request) {
  const limited = rateLimit(request, {
    key: "admin-session",
    limit: 10,
    windowMs: 60 * 1000
  });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = sessionSchema.safeParse(body);

  if (!parsed.success || !isValidStacksWallet(parsed.data.wallet)) {
    return NextResponse.json(
      { ok: false, error: "Invalid admin session request." },
      { status: 400 }
    );
  }

  const session = createAdminSession(parsed.data);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Admin signature could not be verified." },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true, session });
}
