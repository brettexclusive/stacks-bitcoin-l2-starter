import { AllowlistAdmin } from "@/components/allowlist-admin";
import { ClaimPanel } from "@/components/claim-panel";
import { ClaimHistory } from "@/components/claim-history";
import { DropPreview } from "@/components/drop-preview";

export default function Home() {
  const network = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet" ? "Mainnet" : "Testnet";

  return (
    <main className="page">
      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Stacks {network} App</p>
          <h1>{process.env.NEXT_PUBLIC_APP_NAME ?? "Stacks Access Pass"}</h1>
          <p className="lede">
            Claim a one-per-wallet on-chain pass, verify it from Stacks, and manage eligibility with wallet-signed admin access.
          </p>
        </div>
        <DropPreview />
      </section>
      <section className="proofBand" aria-label="How the app works">
        <div>
          <span>1</span>
          <strong>Connect</strong>
          <p>Use Leather or another Stacks wallet.</p>
        </div>
        <div>
          <span>2</span>
          <strong>Claim</strong>
          <p>Submit the `access-pass.claim` contract call.</p>
        </div>
        <div>
          <span>3</span>
          <strong>Verify</strong>
          <p>The app reads your pass back from chain.</p>
        </div>
      </section>
      <ClaimPanel />
      <AllowlistAdmin />
      <ClaimHistory />
    </main>
  );
}
