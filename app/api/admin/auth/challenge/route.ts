import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminChallenge } from "@/lib/admin-auth";
import { isValidStacksWallet } from "@/lib/claims";
import { rateLimit } from "@/lib/rate-limit";

const challengeSchema = z.object({
  wallet: z.string().min(20)
});

export async function GET(request: Request) {
  const limited = rateLimit(request, {
    key: "admin-challenge",
    limit: 10,
    windowMs: 60 * 1000
  });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const parsed = challengeSchema.safeParse({
    wallet: searchParams.get("wallet")
  });

  if (!parsed.success || !isValidStacksWallet(parsed.data.wallet)) {
    return NextResponse.json(
      { error: "Invalid Stacks address for this network." },
      { status: 400 }
    );
  }

  const challenge = createAdminChallenge(parsed.data.wallet);
  if (!challenge) {
    return NextResponse.json(
      { error: "This wallet is not an admin." },
      { status: 403 }
    );
  }

  return NextResponse.json(challenge);
}
