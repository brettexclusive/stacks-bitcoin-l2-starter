import { NextResponse } from "next/server";
import { z } from "zod";
import { getClaimStatus, isValidStacksWallet, recordContractClaimForWallet } from "@/lib/claims";
import { rateLimit } from "@/lib/rate-limit";

const recordSchema = z.object({
  wallet: z.string().min(20),
  txId: z.string().min(32)
});

export async function POST(request: Request) {
  const limited = rateLimit(request, {
    key: "claim-record",
    limit: 20,
    windowMs: 60 * 1000
  });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = recordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid claim record request." },
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
      { ok: false, error: "This wallet is not eligible for the claim." },
      { status: 403 }
    );
  }

  const claim = recordContractClaimForWallet(parsed.data.wallet, parsed.data.txId);
  return NextResponse.json({ ok: true, claim });
}
