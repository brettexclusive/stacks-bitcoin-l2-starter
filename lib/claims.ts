import { verifyMessageSignatureRsv } from "@stacks/encryption";
import { publicKeyToAddress, validateStacksAddress } from "@stacks/transactions";
import crypto from "node:crypto";
import { isAllowlisted } from "@/lib/allowlist-store";
import { getStoredClaim, saveStoredClaim } from "@/lib/claim-store";
import { recordStacksClaim } from "@/lib/stacks-claim";
import { getConfiguredContractId, hasOnChainClaim } from "@/lib/stacks-read";

export type ClaimRecord = {
  wallet: string;
  signature: string;
  assetId: string;
  claimedAt: string;
};

const claims = new Map<string, ClaimRecord>();
const challenges = new Map<string, { nonce: string; message: string; expiresAt: number }>();

export async function getClaimStatus(wallet: string) {
  const normalizedWallet = normalizeWallet(wallet);
  const claim = claims.get(normalizedWallet) ?? getStoredClaim(normalizedWallet);
  const onChainClaimed = await hasOnChainClaim(normalizedWallet).catch(() => null);
  const claimed = Boolean(claim) || Boolean(onChainClaimed);

  return {
    eligible: isEligible(normalizedWallet),
    claimed,
    signature: claim?.signature,
    assetId: claim?.assetId ?? (onChainClaimed ? getConfiguredContractId() : undefined),
    source: onChainClaimed ? "onchain" : claim ? "local" : undefined
  };
}

export async function claimAccessForWallet(wallet: string) {
  const normalizedWallet = normalizeWallet(wallet);
  const existingClaim = claims.get(normalizedWallet) ?? getStoredClaim(normalizedWallet);

  if (existingClaim) return existingClaim;

  const mint = await recordStacksClaim(normalizedWallet);
  const claim: ClaimRecord = {
    wallet: normalizedWallet,
    signature: mint.signature,
    assetId: mint.assetId,
    claimedAt: new Date().toISOString()
  };

  claims.set(normalizedWallet, claim);
  return saveStoredClaim(claim);
}

export function recordContractClaimForWallet(wallet: string, txId: string) {
  const normalizedWallet = normalizeWallet(wallet);
  const existingClaim = claims.get(normalizedWallet) ?? getStoredClaim(normalizedWallet);

  if (existingClaim) return existingClaim;

  const claim: ClaimRecord = {
    wallet: normalizedWallet,
    signature: txId,
    assetId: `${process.env.NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS}.${process.env.NEXT_PUBLIC_STACKS_CONTRACT_NAME}`,
    claimedAt: new Date().toISOString()
  };

  claims.set(normalizedWallet, claim);
  return saveStoredClaim(claim);
}

export function createClaimChallenge(wallet: string) {
  const normalizedWallet = normalizeWallet(wallet);
  const nonce = crypto.randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const message = [
    "Stacks Bitcoin L2 Starter",
    `Wallet: ${normalizedWallet}`,
    `Nonce: ${nonce}`,
    "Only sign this message if you are claiming access in this app."
  ].join("\n");

  challenges.set(normalizedWallet, {
    nonce,
    message,
    expiresAt
  });

  return { message, expiresAt: new Date(expiresAt).toISOString() };
}

export function verifyClaimChallenge({
  wallet,
  message,
  signature,
  publicKey
}: {
  wallet: string;
  message: string;
  signature: string;
  publicKey: string;
}) {
  const normalizedWallet = normalizeWallet(wallet);
  const challenge = challenges.get(normalizedWallet);

  if (!challenge || challenge.message !== message || challenge.expiresAt < Date.now()) {
    challenges.delete(normalizedWallet);
    return false;
  }

  const network = getStacksNetwork();
  const signedAddress = publicKeyToAddress(publicKey, network);
  const verified =
    signedAddress === normalizedWallet &&
    verifyMessageSignatureRsv({
      message,
      signature,
      publicKey
    });

  if (verified) {
    challenges.delete(normalizedWallet);
  }

  return verified;
}

function isEligible(wallet: string) {
  return isAllowlisted(wallet);
}

function normalizeWallet(wallet: string) {
  return wallet.trim();
}

export function isValidStacksWallet(wallet: string) {
  const normalizedWallet = normalizeWallet(wallet);

  if (!validateStacksAddress(normalizedWallet)) return false;
  return getStacksNetwork() === "mainnet"
    ? normalizedWallet.startsWith("SP")
    : normalizedWallet.startsWith("ST");
}

function getStacksNetwork() {
  return process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";
}
