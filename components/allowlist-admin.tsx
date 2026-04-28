"use client";

import { connect, getLocalStorage, request } from "@stacks/connect";
import { CircleAlert, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./allowlist-admin.module.css";

type AllowlistResponse = {
  ok?: boolean;
  wallets?: string[];
  error?: string;
};

type AddressEntry = {
  symbol?: string;
  address: string;
};

type AdminSessionResponse = {
  ok: boolean;
  error?: string;
  session?: {
    token: string;
    wallet: string;
    expiresAt: string;
  };
};

const stacksNetwork = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";

export function AllowlistAdmin() {
  const [wallets, setWallets] = useState<string[]>([]);
  const [walletInput, setWalletInput] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [adminWallet, setAdminWallet] = useState("");
  const [adminExpiresAt, setAdminExpiresAt] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = window.sessionStorage.getItem("admin-token") ?? "";
    const storedWallet = window.sessionStorage.getItem("admin-wallet") ?? "";
    const storedExpiresAt = window.sessionStorage.getItem("admin-expires-at") ?? "";

    if (storedExpiresAt && new Date(storedExpiresAt).getTime() <= Date.now()) {
      clearAdminSession();
      setLoading(false);
      return;
    }

    setAdminToken(storedToken);
    setAdminWallet(storedWallet);
    setAdminExpiresAt(storedExpiresAt);
    if (storedToken) {
      void refreshAllowlist(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!adminToken || !adminExpiresAt) return;

    const expiresIn = new Date(adminExpiresAt).getTime() - now;
    if (expiresIn <= 0) {
      setError("Admin session expired. Sign again to continue.");
      clearAdminSession();
    }
  }, [adminExpiresAt, adminToken, now]);

  async function refreshAllowlist(token = adminToken) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/allowlist", {
        headers: getAdminHeaders(token)
      });
      const result = (await response.json()) as AllowlistResponse;
      if (!response.ok) {
        if (response.status === 401) {
          clearAdminSession();
        }
        setError(result.error ?? "Unable to load allowlist.");
        setWallets([]);
        return;
      }
      setWallets(result.wallets ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function unlockAdmin() {
    setUnlocking(true);
    setError(null);
    try {
      const wallet = await getOrConnectStacksAddress();
      if (!wallet) {
        setError("No Stacks wallet address was returned.");
        return;
      }

      const challengeResponse = await fetch(`/api/admin/auth/challenge?wallet=${wallet}`);
      const challenge = (await challengeResponse.json()) as { message?: string; error?: string };

      if (!challenge.message) {
        setError(challenge.error ?? "Unable to create admin challenge.");
        return;
      }

      const signedMessage = await request("stx_signMessage", {
        message: challenge.message
      });

      const sessionResponse = await fetch("/api/admin/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          message: challenge.message,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        })
      });
      const result = (await sessionResponse.json()) as AdminSessionResponse;

      if (!result.ok || !result.session) {
        setError(result.error ?? "Unable to unlock admin panel.");
        return;
      }

      window.sessionStorage.setItem("admin-token", result.session.token);
      window.sessionStorage.setItem("admin-wallet", result.session.wallet);
      window.sessionStorage.setItem("admin-expires-at", result.session.expiresAt);
      setAdminToken(result.session.token);
      setAdminWallet(result.session.wallet);
      setAdminExpiresAt(result.session.expiresAt);
      void refreshAllowlist(result.session.token);
    } finally {
      setUnlocking(false);
    }
  }

  function lockAdmin() {
    clearAdminSession();
  }

  function clearAdminSession() {
    window.sessionStorage.removeItem("admin-token");
    window.sessionStorage.removeItem("admin-wallet");
    window.sessionStorage.removeItem("admin-expires-at");
    setAdminToken("");
    setAdminWallet("");
    setAdminExpiresAt("");
    setWallets([]);
  }

  async function addWallet() {
    const wallet = walletInput.trim();
    if (!wallet) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/allowlist", {
        method: "POST",
        headers: getAdminHeaders(adminToken),
        body: JSON.stringify({ wallet })
      });
      const result = (await response.json()) as AllowlistResponse;

      if (!response.ok || !result.wallets) {
        if (response.status === 401) {
          clearAdminSession();
        }
        setError(result.error ?? "Unable to add wallet.");
        return;
      }

      setWallets(result.wallets);
      setWalletInput("");
    } finally {
      setSaving(false);
    }
  }

  async function removeWallet(wallet: string) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/allowlist", {
        method: "DELETE",
        headers: getAdminHeaders(adminToken),
        body: JSON.stringify({ wallet })
      });
      const result = (await response.json()) as AllowlistResponse;

      if (!response.ok || !result.wallets) {
        if (response.status === 401) {
          clearAdminSession();
        }
        setError(result.error ?? "Unable to remove wallet.");
        return;
      }

      setWallets(result.wallets);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.adminShell}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Admin</p>
          <h2>Allowlist</h2>
        </div>
        <span>{adminToken ? (wallets.length === 0 ? "Open claim" : `${wallets.length} wallets`) : "Locked"}</span>
      </div>

      {!adminToken ? (
        <div className={styles.unlockRow}>
          <button type="button" onClick={unlockAdmin} disabled={unlocking}>
            {unlocking ? <Loader2 className={styles.spin} size={18} aria-hidden /> : <KeyRound size={18} aria-hidden />}
            {unlocking ? "Signing" : "Unlock With Admin Wallet"}
          </button>
        </div>
      ) : (
        <>
          <div className={styles.formRow}>
            <input
              value={walletInput}
              onChange={(event) => setWalletInput(event.target.value)}
              placeholder="ST..."
              aria-label="Stacks address"
            />
            <button type="button" onClick={addWallet} disabled={saving || !walletInput.trim()}>
              {saving ? <Loader2 className={styles.spin} size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
              Add
            </button>
          </div>
          <div className={styles.lockRow}>
            <span>{shortenAddress(adminWallet)} · {formatTimeRemaining(adminExpiresAt, now)}</span>
            <button type="button" onClick={lockAdmin}>Lock admin panel</button>
          </div>
        </>
      )}

      {error ? (
        <div className={styles.errorRow}>
          <CircleAlert size={16} aria-hidden />
          {error}
        </div>
      ) : null}

      {!adminToken ? (
        <div className={styles.emptyState}>Connect an admin wallet and sign a message to manage eligible wallets.</div>
      ) : loading ? (
        <div className={styles.emptyState}>Loading allowlist.</div>
      ) : wallets.length === 0 ? (
        <div className={styles.emptyState}>No allowlist entries. Any valid testnet wallet is eligible.</div>
      ) : (
        <div className={styles.walletList}>
          {wallets.map((wallet) => (
            <div className={styles.walletRow} key={wallet}>
              <span>{wallet}</span>
              <button type="button" onClick={() => removeWallet(wallet)} disabled={saving} aria-label={`Remove ${wallet}`}>
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

async function getOrConnectStacksAddress() {
  const storedWallet = getStoredStacksAddress();
  if (storedWallet) return storedWallet;

  const response = await connect({ network: stacksNetwork });
  return getStacksAddress(response.addresses);
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

function getAdminHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    "x-admin-token": token
  };
}

function shortenAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function formatTimeRemaining(expiresAt: string, now: number) {
  if (!expiresAt) return "session active";

  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - now);
  const remainingMinutes = Math.ceil(remainingMs / 60000);

  if (remainingMinutes <= 0) return "expired";
  if (remainingMinutes === 1) return "expires in 1 min";
  return `expires in ${remainingMinutes} min`;
}
