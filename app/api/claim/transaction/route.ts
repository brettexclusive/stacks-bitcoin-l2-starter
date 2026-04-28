import { NextResponse } from "next/server";
import { z } from "zod";

const transactionSchema = z.object({
  txId: z.string().min(32)
});

type TransactionResponse = {
  tx_status?: string;
  tx_result?: {
    repr?: string;
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = transactionSchema.safeParse({
    txId: searchParams.get("txId")
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid transaction id." },
      { status: 400 }
    );
  }

  const network = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";
  const apiBase =
    network === "mainnet"
      ? "https://api.mainnet.hiro.so"
      : "https://api.testnet.hiro.so";
  const response = await fetch(`${apiBase}/extended/v1/tx/${parsed.data.txId}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(5000)
  });

  if (response.status === 404) {
    return NextResponse.json({ ok: true, status: "pending" });
  }

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, error: `Unable to read transaction status: ${response.status}` },
      { status: 502 }
    );
  }

  const transaction = (await response.json()) as TransactionResponse;
  return NextResponse.json({
    ok: true,
    status: transaction.tx_status ?? "pending",
    result: transaction.tx_result?.repr
  });
}
