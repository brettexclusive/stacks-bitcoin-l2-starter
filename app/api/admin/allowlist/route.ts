import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminSession } from "@/lib/admin-auth";
import { addAllowlistWallet, listAllowlistWallets, removeAllowlistWallet } from "@/lib/allowlist-store";
import { isValidStacksWallet } from "@/lib/claims";

const allowlistSchema = z.object({
  wallet: z.string().min(20)
});

export async function GET(request: Request) {
  const authError = requireAdminSecret(request);
  if (authError) return authError;

  return NextResponse.json({
    wallets: listAllowlistWallets()
  });
}

export async function POST(request: Request) {
  const authError = requireAdminSecret(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const parsed = allowlistSchema.safeParse(body);

  if (!parsed.success || !isValidStacksWallet(parsed.data.wallet)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid Stacks address for this network." },
      { status: 400 }
    );
  }

  const wallet = addAllowlistWallet(parsed.data.wallet);
  return NextResponse.json({
    ok: true,
    wallet,
    wallets: listAllowlistWallets()
  });
}

export async function DELETE(request: Request) {
  const authError = requireAdminSecret(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const parsed = allowlistSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid allowlist request." },
      { status: 400 }
    );
  }

  const wallet = removeAllowlistWallet(parsed.data.wallet);
  return NextResponse.json({
    ok: true,
    wallet,
    wallets: listAllowlistWallets()
  });
}

function requireAdminSecret(request: Request) {
  if (!verifyAdminSession(request.headers.get("x-admin-token"))) {
    return NextResponse.json(
      { ok: false, error: "Admin wallet signature is required." },
      { status: 401 }
    );
  }

  return null;
}
