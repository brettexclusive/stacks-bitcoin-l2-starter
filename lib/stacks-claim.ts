import crypto from "node:crypto";

export type MintResult = {
  signature: string;
  assetId: string;
};

export async function recordStacksClaim(wallet: string): Promise<MintResult> {
  if (process.env.STACKS_CLAIM_MODE === "live") {
    return callClaimContract(wallet);
  }

  return mockStacksClaim(wallet);
}

async function callClaimContract(_wallet: string): Promise<MintResult> {
  throw new Error(
    "Live Stacks claims are not configured yet. Add a deployed Clarity contract, then call it with Stacks Connect or a server-side transaction signer."
  );
}

function mockStacksClaim(wallet: string): MintResult {
  const seed = `${wallet}:${Date.now()}:${crypto.randomUUID()}`;
  const digest = crypto.createHash("sha256").update(seed).digest("hex");

  return {
    signature: `mock_stx_${digest.slice(0, 48)}`,
    assetId: `claim_${digest.slice(0, 32)}`
  };
}
