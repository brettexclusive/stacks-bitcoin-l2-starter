import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const wallet = accounts.get("wallet_1")!;

describe("access-pass", () => {
  it("lets a wallet claim once and records the claim", () => {
    const claim = simnet.callPublicFn("access-pass", "claim", [], wallet);
    expect(claim.result).toEqual({ type: "ok", value: { type: "true" } });

    const hasClaimed = simnet.callReadOnlyFn(
      "access-pass",
      "has-claimed",
      [Cl.standardPrincipal(wallet)],
      wallet
    );
    expect(hasClaimed.result).toEqual({ type: "true" });

    const claimRecord = simnet.callReadOnlyFn(
      "access-pass",
      "get-claim",
      [Cl.standardPrincipal(wallet)],
      wallet
    );
    expect(claimRecord.result).toMatchObject({
      type: "some",
      value: {
        type: "tuple",
        value: {
          "claimed-at": {
            type: "uint"
          }
        }
      }
    });
  });

  it("rejects duplicate claims from the same wallet", () => {
    const firstClaim = simnet.callPublicFn("access-pass", "claim", [], wallet);
    expect(firstClaim.result).toEqual({ type: "ok", value: { type: "true" } });

    const secondClaim = simnet.callPublicFn("access-pass", "claim", [], wallet);
    expect(secondClaim.result).toEqual({
      type: "err",
      value: {
        type: "uint",
        value: 100n
      }
    });
  });
});
