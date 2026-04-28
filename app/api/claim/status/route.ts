import { NextResponse } from "next/server";
import { z } from "zod";
import { getClaimStatus, isValidStacksWallet } from "@/lib/claims";

const statusSchema = z.object({
  wallet: z.string().min(20)
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = statusSchema.safeParse({
    wallet: searchParams.get("wallet")
  });

  if (!parsed.success) {
    return NextResponse.json(
      { eligible: false, claimed: false, error: "Invalid wallet address." },
      { status: 400 }
    );
  }

  if (!isValidStacksWallet(parsed.data.wallet)) {
    return NextResponse.json(
      { eligible: false, claimed: false, error: "Invalid Stacks address for this network." },
      { status: 400 }
    );
  }

  return NextResponse.json(await getClaimStatus(parsed.data.wallet));
}
