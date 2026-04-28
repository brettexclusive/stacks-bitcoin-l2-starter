import { NextResponse } from "next/server";
import { z } from "zod";
import { claimAccessForWallet, getClaimStatus, isValidStacksWallet, verifyClaimChallenge } from "@/lib/claims";
import { rateLimit } from "@/lib/rate-limit";

const claimSchema = z.object({
  wallet: z.string().min(20),
  message: z.string().min(1),
  signature: z.string().min(1),
  publicKey: z.string().min(1)
});

export async function POST(request: Request) {
  const limited = rateLimit(request, {
    key: "claim-submit",
    limit: 10,
    windowMs: 60 * 1000
  });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid claim request." },
      { status: 400 }
    );
  }

  if (!isValidStacksWallet(parsed.data.wallet)) {
    return NextResponse.json(
      { ok: false, error: "Invalid Stacks address for this network." },
      { status: 400 }
    );
  }

  const status = await getClaimStatus(parsed.data.wallet);
  if (!status.eligible) {
    return NextResponse.json(
      { ok: false, error: "This wallet is not eligible for the drop." },
      { status: 403 }
    );
  }

  if (status.claimed) {
    return NextResponse.json(
      { ok: false, error: "This wallet has already claimed." },
      { status: 409 }
    );
  }

  if (!verifyClaimChallenge(parsed.data)) {
    return NextResponse.json(
      { ok: false, error: "Wallet signature could not be verified." },
      { status: 401 }
    );
  }

  const claim = await claimAccessForWallet(parsed.data.wallet);
  return NextResponse.json({ ok: true, claim });
}
