import { NextResponse } from "next/server";
import { z } from "zod";
import { createClaimChallenge, isValidStacksWallet } from "@/lib/claims";
import { rateLimit } from "@/lib/rate-limit";

const challengeSchema = z.object({
  wallet: z.string().min(20)
});

export async function GET(request: Request) {
  const limited = rateLimit(request, {
    key: "claim-challenge",
    limit: 20,
    windowMs: 60 * 1000
  });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const parsed = challengeSchema.safeParse({
    wallet: searchParams.get("wallet")
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid wallet address." },
      { status: 400 }
    );
  }

  if (!isValidStacksWallet(parsed.data.wallet)) {
    return NextResponse.json(
      { error: "Invalid Stacks address for this network." },
      { status: 400 }
    );
  }

  return NextResponse.json(createClaimChallenge(parsed.data.wallet));
}
