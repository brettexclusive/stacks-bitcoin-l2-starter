import { ExternalLink } from "lucide-react";
import { listStoredClaims } from "@/lib/claim-store";
import styles from "./claim-history.module.css";

const stacksNetwork = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";

export function ClaimHistory() {
  const claims = listStoredClaims()
    .slice()
    .sort((a, b) => b.claimedAt.localeCompare(a.claimedAt));

  return (
    <section className={styles.historyShell}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Claim History</p>
          <h2>Recent records</h2>
        </div>
        <span>{claims.length} total</span>
      </div>

      {claims.length === 0 ? (
        <div className={styles.emptyState}>No local claim records yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Transaction</th>
                <th>Contract</th>
                <th>Claimed</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr key={`${claim.wallet}-${claim.signature}`}>
                  <td>{shortenAddress(claim.wallet)}</td>
                  <td>
                    {claim.signature.startsWith("mock_") ? (
                      shortenHash(claim.signature)
                    ) : (
                      <a href={getExplorerUrl(claim.signature)} target="_blank" rel="noreferrer">
                        {shortenHash(claim.signature)}
                        <ExternalLink size={14} aria-hidden />
                      </a>
                    )}
                  </td>
                  <td>{claim.assetId}</td>
                  <td>{formatDate(claim.claimedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function getExplorerUrl(txId: string) {
  return `https://explorer.hiro.so/txid/${txId}?chain=${stacksNetwork}`;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function shortenHash(hash: string) {
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
