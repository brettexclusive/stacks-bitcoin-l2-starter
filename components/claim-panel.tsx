"use client";

import { connect, disconnect, getLocalStorage, request } from "@stacks/connect";
import { CheckCircle2, CircleAlert, Clock3, ExternalLink, Loader2, LogOut, Ticket, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./claim-panel.module.css";

type AddressEntry = {
  symbol?: string;
  address: string;
  publicKey?: string;
};

type ClaimStatus = {
  eligible: boolean;
  claimed: boolean;
  signature?: string;
  assetId?: string;
  error?: string;
};

type ClaimResponse = {
  ok: boolean;
  error?: string;
  claim?: {
    wallet: string;
    signature: string;
    assetId: string;
    claimedAt: string;
  };
};

type TransactionStatusResponse = {
  ok: boolean;
  status?: string;
  result?: string;
  error?: string;
};

const stacksNetwork = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";
const contractAddress = process.env.NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS;
const contractName = process.env.NEXT_PUBLIC_STACKS_CONTRACT_NAME;
const contractFunction = process.env.NEXT_PUBLIC_STACKS_CONTRACT_FUNCTION ?? "claim";
const contractId = contractAddress && contractName ? `${contractAddress}.${contractName}` : null;

export function ClaimPanel() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [status, setStatus] = useState<ClaimStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);

  const explorerUrl = useMemo(() => {
    if (!status?.signature || status.signature.startsWith("mock_")) return null;
    return `https://explorer.hiro.so/txid/${status.signature}?chain=${stacksNetwork}`;
  }, [status?.signature]);

  const refreshStatus = useCallback(async () => {
    if (!wallet) {
      setStatus(null);
      return;
    }

    setLoadingStatus(true);
    try {
      const response = await fetch(`/api/claim/status?wallet=${wallet}`);
      setStatus(await response.json());
    } finally {
      setLoadingStatus(false);
    }
  }, [wallet]);

  useEffect(() => {
    const storedWallet = getStoredStacksAddress();
    if (storedWallet) setWallet(storedWallet);
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  async function connectWallet() {
    setConnecting(true);
    try {
      const response = await connect({ network: stacksNetwork });
      setWallet(getStacksAddress(response.addresses));
    } finally {
      setConnecting(false);
    }
  }

  function disconnectWallet() {
    disconnect();
    setWallet(null);
    setStatus(null);
    setPendingTxId(null);
  }

  async function claim() {
    if (!wallet) return;

    setClaiming(true);
    try {
      if (contractId) {
        const tx = await request("stx_callContract", {
          contract: contractId as `${string}.${string}`,
          functionName: contractFunction,
          functionArgs: [],
          network: stacksNetwork,
          address: wallet,
          postConditionMode: "allow"
        });

        if (!tx.txid) {
          setStatus((current) => ({
            eligible: current?.eligible ?? true,
            claimed: current?.claimed ?? false,
            error: "Wallet did not return a transaction id."
          }));
          return;
        }

        setPendingTxId(tx.txid);
        setStatus({
          eligible: true,
          claimed: false,
          signature: tx.txid
        });
        void waitForConfirmation(tx.txid, wallet);
        return;
      }

      const challengeResponse = await fetch(`/api/claim/challenge?wallet=${wallet}`);
      const challenge = (await challengeResponse.json()) as { message?: string; error?: string };

      if (!challenge.message) {
        setStatus((current) => ({
          eligible: current?.eligible ?? false,
          claimed: current?.claimed ?? false,
          error: challenge.error ?? "Unable to create claim challenge."
        }));
        return;
      }

      const signedMessage = await request("stx_signMessage", {
        message: challenge.message
      });

      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          message: challenge.message,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        })
      });
      const result = (await response.json()) as ClaimResponse;
      if (!result.ok || !result.claim) {
        setStatus((current) => ({
          eligible: current?.eligible ?? false,
          claimed: current?.claimed ?? false,
          error: result.error ?? "Claim failed."
        }));
        return;
      }
      setStatus({
        eligible: true,
        claimed: true,
        signature: result.claim.signature,
        assetId: result.claim.assetId
      });
    } finally {
      setClaiming(false);
    }
  }

  async function waitForConfirmation(txId: string, currentWallet: string) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await delay(5000);

      const response = await fetch(`/api/claim/transaction?txId=${txId}`);
      const transaction = (await response.json()) as TransactionStatusResponse;

      if (!transaction.ok) {
        setStatus((current) => ({
          eligible: current?.eligible ?? true,
          claimed: false,
          signature: txId,
          error: transaction.error ?? "Unable to read transaction status."
        }));
        setPendingTxId(null);
        return;
      }

      if (transaction.status === "success") {
        const recordResponse = await fetch("/api/claim/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: currentWallet,
            txId
          })
        });
        const result = (await recordResponse.json()) as ClaimResponse;

        if (!result.ok || !result.claim) {
          setStatus((current) => ({
            eligible: current?.eligible ?? true,
            claimed: false,
            signature: txId,
            error: result.error ?? "Transaction confirmed, but the app could not record it."
          }));
          setPendingTxId(null);
          return;
        }

        setPendingTxId(null);
        setStatus({
          eligible: true,
          claimed: true,
          signature: result.claim.signature,
          assetId: result.claim.assetId
        });
        void refreshStatus();
        return;
      }

      if (transaction.status?.startsWith("abort") || transaction.status === "dropped_by_mempool") {
        setStatus((current) => ({
          eligible: current?.eligible ?? true,
          claimed: false,
          signature: txId,
          error: `Transaction ${transaction.status}${transaction.result ? `: ${transaction.result}` : ""}`
        }));
        setPendingTxId(null);
        return;
      }
    }

    setPendingTxId(null);
  }

  return (
    <section className={styles.claimShell}>
      <div className={styles.toolbar}>
        <div>
          <p className={styles.kicker}>Claim Portal</p>
          <h2>{wallet ? shortenAddress(wallet) : "Connect your Stacks wallet"}</h2>
        </div>
        <div className={styles.walletActions}>
          {wallet ? (
            <button className={styles.secondaryAction} type="button" onClick={disconnectWallet}>
              <LogOut size={16} aria-hidden />
              Disconnect
            </button>
          ) : (
            <button className={styles.claimButton} type="button" onClick={connectWallet} disabled={connecting}>
              {connecting ? <Loader2 className={styles.spin} size={18} aria-hidden /> : <Wallet size={18} aria-hidden />}
              {connecting ? "Connecting" : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>

      {!wallet ? (
        <StateMessage
          icon={<Ticket aria-hidden />}
          title="Connect to begin"
          body="Eligibility is checked against your Stacks address after your wallet connects."
        />
      ) : loadingStatus ? (
        <StateMessage
          icon={<Loader2 className={styles.spin} aria-hidden />}
          title="Checking eligibility"
          body="Reading the allowlist and claim history for this Stacks address."
        />
      ) : pendingTxId ? (
        <StateMessage
          icon={<Clock3 aria-hidden />}
          title="Transaction pending"
          body={`Your contract call was submitted and is waiting for ${stacksNetwork} confirmation.`}
          action={
            <a className={styles.secondaryAction} href={getExplorerUrl(pendingTxId)} target="_blank" rel="noreferrer">
              View transaction <ExternalLink size={16} aria-hidden />
            </a>
          }
        />
      ) : status?.claimed ? (
        <StateMessage
          icon={<CheckCircle2 aria-hidden />}
          title="Claim recorded"
          body="This Stacks address has already completed its app claim."
          action={
            explorerUrl ? (
              <a className={styles.secondaryAction} href={explorerUrl} target="_blank" rel="noreferrer">
                View transaction <ExternalLink size={16} aria-hidden />
              </a>
            ) : null
          }
        />
      ) : status?.eligible ? (
        <div className={styles.readyState}>
          <div>
            <p className={styles.statusLine}>Eligible</p>
            <h3>Your Stacks claim is ready.</h3>
            <p>{contractId ? `Submit a ${stacksNetwork} contract call to mint your access pass record.` : "Sign a wallet message to prove control of this address and record the claim."}</p>
          </div>
          <button className={styles.claimButton} type="button" onClick={claim} disabled={claiming}>
            {claiming ? <Loader2 className={styles.spin} size={18} aria-hidden /> : <Ticket size={18} aria-hidden />}
            {claiming ? "Claiming" : "Claim Access"}
          </button>
        </div>
      ) : (
        <StateMessage
          icon={<CircleAlert aria-hidden />}
          title="Not eligible"
          body={status?.error ?? "This Stacks address is not on the current allowlist."}
          tone="warning"
        />
      )}
    </section>
  );
}

function StateMessage({
  icon,
  title,
  body,
  action,
  tone = "neutral"
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className={styles.stateMessage} data-tone={tone}>
      <div className={styles.stateIcon}>{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
        {action}
      </div>
    </div>
  );
}

function getStoredStacksAddress() {
  const addresses = getLocalStorage()?.addresses;
  if (!addresses) return null;

  if (Array.isArray(addresses)) {
    return getStacksAddress(addresses as AddressEntry[]);
  }

  const addressGroups = addresses as { stx?: AddressEntry[]; btc?: AddressEntry[] };
  return addressGroups.stx?.[0]?.address ?? null;
}

function getStacksAddress(addresses: AddressEntry[]) {
  return (
    addresses.find((entry) => entry.symbol?.toUpperCase() === "STX")?.address ??
    addresses.find((entry) => entry.address.startsWith("SP") || entry.address.startsWith("ST"))?.address ??
    null
  );
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function getExplorerUrl(txId: string) {
  return `https://explorer.hiro.so/txid/${txId}?chain=${stacksNetwork}`;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
