import { verifyMessageSignatureRsv } from "@stacks/encryption";
import { publicKeyToAddress } from "@stacks/transactions";
import crypto from "node:crypto";

const challenges = new Map<string, { message: string; expiresAt: number }>();
const sessions = new Map<string, { wallet: string; expiresAt: number }>();

export function createAdminChallenge(wallet: string) {
  const normalizedWallet = normalizeWallet(wallet);

  if (!isAdminWallet(normalizedWallet)) {
    return null;
  }

  const nonce = crypto.randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const message = [
    "Stacks Bitcoin L2 Starter Admin",
    `Wallet: ${normalizedWallet}`,
    `Nonce: ${nonce}`,
    "Sign this message to manage the local allowlist."
  ].join("\n");

  challenges.set(normalizedWallet, { message, expiresAt });
  return { message, expiresAt: new Date(expiresAt).toISOString() };
}

export function createAdminSession({
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
    return null;
  }

  const signedAddress = publicKeyToAddress(publicKey, getStacksNetwork());
  const verified =
    signedAddress === normalizedWallet &&
    verifyMessageSignatureRsv({
      message,
      signature,
      publicKey
    });

  if (!verified) return null;

  challenges.delete(normalizedWallet);

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 60 * 60 * 1000;
  sessions.set(token, { wallet: normalizedWallet, expiresAt });

  return {
    token,
    wallet: normalizedWallet,
    expiresAt: new Date(expiresAt).toISOString()
  };
}

export function verifyAdminSession(token: string | null) {
  if (!token) return false;

  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }

  return isAdminWallet(session.wallet);
}

function isAdminWallet(wallet: string) {
  const admins = (process.env.ADMIN_WALLETS ?? "")
    .split(",")
    .map((entry) => normalizeWallet(entry))
    .filter(Boolean);

  return admins.includes(normalizeWallet(wallet));
}

function normalizeWallet(wallet: string) {
  return wallet.trim();
}

function getStacksNetwork() {
  return process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";
}
