import { Cl, cvToHex, cvToValue, hexToCV } from "@stacks/transactions";

type ReadOnlyResponse = {
  okay: boolean;
  result?: string;
  cause?: string;
};

const contractAddress = process.env.NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS;
const contractName = process.env.NEXT_PUBLIC_STACKS_CONTRACT_NAME;
const stacksNetwork = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";

export async function hasOnChainClaim(wallet: string) {
  if (!contractAddress || !contractName) return null;

  const apiBase =
    stacksNetwork === "mainnet"
      ? "https://api.mainnet.hiro.so"
      : "https://api.testnet.hiro.so";
  const url = `${apiBase}/v2/contracts/call-read/${contractAddress}/${contractName}/has-claimed`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      sender: wallet,
      arguments: [cvToHex(Cl.standardPrincipal(wallet))]
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    throw new Error(`Read-only contract call failed with ${response.status}.`);
  }

  const body = (await response.json()) as ReadOnlyResponse;
  if (!body.okay || !body.result) {
    throw new Error(body.cause ?? "Read-only contract call returned an error.");
  }

  return Boolean(cvToValue(hexToCV(body.result)));
}

export function getConfiguredContractId() {
  return contractAddress && contractName ? `${contractAddress}.${contractName}` : undefined;
}
