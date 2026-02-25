# MangoSwap Redesign

A refreshed MangoSwap UI built with the design from `el_mango_dapp/replica_mang-main`, running on **port 3003**.

## Design

- Dark theme (#111111 background)
- Afacad font
- Green-yellow gradient accents (#3CF902, #FFF306)
- Mobile-first layout (max-width 402px)
- Wavy SVG swap cards with gradient borders
- Slide To Swap button
- Reown AppKit wallet integration

## Run

```bash
npm install
npm run dev
```

App runs at **http://localhost:3003**

### Deploy (Vercel)

For the wallet connect modal to load the full wallet list from Reown, set this in your Vercel project **Environment Variables**:

- **`VITE_REOWN_PROJECT_ID`** – Create a project at [Reown Dashboard](https://dashboard.reown.com/) and paste the Project ID. If unset, a fallback ID is used and custom wallets (MetaMask, Trust, Coinbase, WalletConnect) still show.

## Stack

- Vite + React 18
- Tailwind CSS
- Reown AppKit + Wagmi + viem
- React Router
