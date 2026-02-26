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

### Deploy (Vercel) – WalletConnect / Reown

WalletConnect (QR code, mobile) will return **403** and **WebSocket 3000 (Unauthorized: invalid key)** until Reown is configured correctly.

1. **Create a project** at [Reown Dashboard](https://dashboard.reown.com/) (or [cloud.reown.com](https://cloud.reown.com)).
2. **Add Allowed Origins** in that project:
   - `https://el-mango-dapp.vercel.app` (your production URL)
   - `http://localhost:3003` (for local dev)
   Without these, `api.web3modal.org` and the relay will reject requests (403 / invalid key).
3. **Set in Vercel** → Project → Settings → Environment Variables:
   - **`VITE_REOWN_PROJECT_ID`** = your Reown project ID (e.g. `prj_...`).
4. Redeploy so the new env is used.

**Detailed steps:** [docs/WALLETCONNECT_SETUP.md](docs/WALLETCONNECT_SETUP.md) (fix 403 and “Unauthorized: invalid key”).

## Stack

- Vite + React 18
- Tailwind CSS
- Reown AppKit + Wagmi + viem
- React Router
