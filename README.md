# Stacks Bitcoin L2 Starter

A wallet-gated starter app for building on Bitcoin Layer 2 with Stacks. Users connect a Stacks wallet, the app checks an allowlist, and eligible addresses submit a Stacks testnet contract call to record a claim.

The MVP includes a deployed `access-pass` Clarity contract, pending transaction handling, on-chain claim reads through Hiro APIs, persisted local claim records, and wallet-signed admin access for allowlist management.

## Stack

- Next.js and TypeScript
- Stacks Connect for wallet connection and message signing
- Stacks message verification on the server
- Clarinet for Clarity contract development and tests
- Hiro APIs for transaction status and read-only contract calls
- API routes for eligibility and claim state
- Environment-driven app configuration

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Configure Network

```bash
NEXT_PUBLIC_STACKS_NETWORK=testnet
```

Use `testnet` while developing. Switch to `mainnet` only after your contract, allowlist, and monitoring are production-ready.

## Configure Eligibility

Eligibility can be managed in the app's admin panel. Admin wallets are configured in `.env.local`:

```bash
ADMIN_WALLETS=ST...
```

The admin wallet signs a message to unlock allowlist management. Allowlist entries are stored locally in `data/allowlist.json`. If the allowlist is empty, every connected Stacks address is eligible. That is convenient for local testing, but do not use it for a production app.

## Configure App Display

```bash
NEXT_PUBLIC_APP_NAME=sBTC Access Pass
NEXT_PUBLIC_APP_SYMBOL=SBTC
NEXT_PUBLIC_APP_IMAGE_URL=https://...
```

## Live Stacks Plan

The Stacks devtools catalog points to the core building blocks for this path:

1. Use Clarinet to write and test a Clarity contract.
2. Use Stacks Connect in the frontend to connect wallets, sign messages, and request contract calls.
3. Use Stacks.js packages to build transaction arguments and verify signatures.
4. Use Hiro APIs or Chainhooks to track contract events and update durable claim state.
5. Set `NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS`, `NEXT_PUBLIC_STACKS_CONTRACT_NAME`, and `NEXT_PUBLIC_STACKS_CONTRACT_FUNCTION` after deployment.
6. Replace local JSON storage in `data/` with a hosted database before production.

## Contract Checks

```bash
cd contracts
clarinet check
npm install
npm test
```

## Deployment

For Vercel or another hosted Next.js environment, set these environment variables:

```bash
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_APP_NAME=sBTC Access Pass
NEXT_PUBLIC_APP_SYMBOL=SBTC
NEXT_PUBLIC_APP_IMAGE_URL=
NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS=ST...
NEXT_PUBLIC_STACKS_CONTRACT_NAME=access-pass
NEXT_PUBLIC_STACKS_CONTRACT_FUNCTION=claim
ADMIN_WALLETS=ST...
ALLOWLIST_WALLETS=
```

Do not deploy `.env.local`, `data/`, or `contracts/settings/*.toml`. The local JSON store is useful for development, but production deployments should use a durable database because serverless filesystems are ephemeral.

## Mainnet Runbook

Do not switch the app to mainnet until the mainnet contract exists. The safe order is:

1. Create a fresh mainnet deployer wallet and fund it with enough STX for deployment fees.
2. Configure `contracts/settings/Mainnet.toml` locally. Never commit that file.
3. Generate and apply a mainnet deployment plan from `contracts/`.
4. Copy the deployed `SP...access-pass` contract address.
5. Update hosted environment variables:

```bash
NEXT_PUBLIC_STACKS_NETWORK=mainnet
NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS=SP...
NEXT_PUBLIC_STACKS_CONTRACT_NAME=access-pass
NEXT_PUBLIC_STACKS_CONTRACT_FUNCTION=claim
ADMIN_WALLETS=SP...
```

6. Redeploy the web app and test with a small mainnet transaction.

Mainnet notes:

- Use a fresh wallet whose seed phrase has never been pasted into chat, logs, or a repo.
- Keep allowlist/admin data in a hosted database before using the app seriously.
- Contract calls cost real STX on mainnet.

## Production Notes

- Keep all eligibility and duplicate-claim checks on the server.
- Persist claims before or atomically with live contract completion.
- Add rate limits and short-lived nonces around the challenge endpoint.
- Use Hiro Explorer and Platform to inspect live transactions and chain events.
- Use a fresh deployer wallet for serious demos; never reuse a seed phrase that has been pasted into chat or logs.
