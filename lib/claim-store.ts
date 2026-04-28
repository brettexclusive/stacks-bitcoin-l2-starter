import fs from "node:fs";
import path from "node:path";
import type { ClaimRecord } from "@/lib/claims";

const dataDir = path.join(process.cwd(), "data");
const claimsFile = path.join(dataDir, "claims.json");

export function getStoredClaim(wallet: string) {
  return readClaims().find((claim) => claim.wallet === wallet);
}

export function saveStoredClaim(claim: ClaimRecord) {
  const claims = readClaims();
  const existingIndex = claims.findIndex((entry) => entry.wallet === claim.wallet);

  if (existingIndex >= 0) {
    claims[existingIndex] = claim;
  } else {
    claims.push(claim);
  }

  writeClaims(claims);
  return claim;
}

export function listStoredClaims() {
  return readClaims();
}

function readClaims() {
  if (!fs.existsSync(claimsFile)) return [];

  try {
    return JSON.parse(fs.readFileSync(claimsFile, "utf8")) as ClaimRecord[];
  } catch {
    return [];
  }
}

function writeClaims(claims: ClaimRecord[]) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(claimsFile, `${JSON.stringify(claims, null, 2)}\n`);
}
