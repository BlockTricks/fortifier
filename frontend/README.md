# Fortifier Frontend

Next.js frontend for interacting with the Fortifier circuit-breaker contract on Stacks.

## Features

- ✅ Wallet connection using @stacks/connect
- ✅ View circuit breaker status (paused/active)
- ✅ Emergency pause functionality
- ✅ Unpause functionality
- ✅ Real-time status updates
- ✅ Transaction tracking

## Setup

```bash
cd frontend
npm install
```

## Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=ST2QNSNKR3NRDWNTX0Q7R4T8WGBJ8RE8RA7GKS7WN.circuit-breaker
NEXT_PUBLIC_NETWORK=testnet
```

## Contract Address

The frontend is configured to interact with:
- **Contract:** `ST2QNSNKR3NRDWNTX0Q7R4T8WGBJ8RE8RA7GKS7WN.circuit-breaker`
- **Network:** Stacks Testnet

## Usage

1. Connect your Hiro Wallet
2. View the current circuit breaker status
3. Use "Emergency Pause" to pause the contract
4. Use "Unpause" to resume operations

## Technologies

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- @stacks/connect
- @stacks/transactions
