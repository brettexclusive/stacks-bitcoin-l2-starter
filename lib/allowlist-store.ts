import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const allowlistFile = path.join(dataDir, "allowlist.json");

export function listAllowlistWallets() {
  return Array.from(new Set([...readAllowlist(), ...getEnvAllowlist()])).sort();
}

export function addAllowlistWallet(wallet: string) {
  const normalizedWallet = normalizeWallet(wallet);
  const wallets = new Set(readAllowlist());
  wallets.add(normalizedWallet);
  writeAllowlist(Array.from(wallets).sort());
  return normalizedWallet;
}

export function removeAllowlistWallet(wallet: string) {
  const normalizedWallet = normalizeWallet(wallet);
  const wallets = readAllowlist().filter((entry) => entry !== normalizedWallet);
  writeAllowlist(wallets);
  return normalizedWallet;
}

export function isAllowlisted(wallet: string) {
  const allowlist = listAllowlistWallets();
  return allowlist.length === 0 || allowlist.includes(normalizeWallet(wallet));
}

function readAllowlist() {
  if (!fs.existsSync(allowlistFile)) return [];

  try {
    const parsed = JSON.parse(fs.readFileSync(allowlistFile, "utf8")) as string[];
    return parsed.map((entry) => normalizeWallet(entry)).filter(Boolean);
  } catch {
    return [];
  }
}

function writeAllowlist(wallets: string[]) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(allowlistFile, `${JSON.stringify(wallets, null, 2)}\n`);
}

function getEnvAllowlist() {
  return (process.env.ALLOWLIST_WALLETS ?? "")
    .split(",")
    .map((entry) => normalizeWallet(entry))
    .filter(Boolean);
}

function normalizeWallet(wallet: string) {
  return wallet.trim();
}
