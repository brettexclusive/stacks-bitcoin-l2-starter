import { AllowlistAdmin } from "@/components/allowlist-admin";
import { ClaimPanel } from "@/components/claim-panel";
import { ClaimHistory } from "@/components/claim-history";
import { DropPreview } from "@/components/drop-preview";

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Stacks Bitcoin L2</p>
          <h1>{process.env.NEXT_PUBLIC_APP_NAME ?? "sBTC Access Pass"}</h1>
          <p className="lede">
            Connect a Stacks wallet, prove ownership, and claim access to your Bitcoin L2 app flow.
          </p>
        </div>
        <DropPreview />
      </section>
      <ClaimPanel />
      <AllowlistAdmin />
      <ClaimHistory />
    </main>
  );
}
