# Publishing NEURO to the Solana dApp Store

This guide walks through submitting the NEURO Android APK to the
[Solana dApp Store](https://publish.solanamobile.com) to fully satisfy the
Solana Mobile track. The publishing config lives at
[`mobile/dapp-store/config.yaml`](../mobile/dapp-store/config.yaml).

Unlike Google Play, the Solana dApp Store has **no fees and no review-tax** —
publisher, app, and each release are minted as NFTs on a publishing chain, and
the store mirrors them. You keep custody of the publisher identity.

## Prerequisites

- The release **APK** (not an AAB). Build it with EAS:
  ```bash
  cd mobile
  npx eas-cli build --platform android --profile preview   # produces an APK
  ```
  Download the artifact and note its local path.
- A funded Solana keypair to pay mint/rent fees. Mainnet-beta is required for a
  live listing; you can rehearse the whole flow on devnet first.
  ```bash
  solana-keygen new --outfile ~/.config/solana/dapp-store.json
  solana airdrop 2 --url devnet   # devnet rehearsal only
  ```
- Node 18+ and the publishing CLI (run via `npx`, no global install needed).
- `apksigner`/`aapt2` from the Android SDK build-tools (the CLI uses them to read
  the APK). On CI/Linux: `sudo apt-get install -y android-sdk-build-tools` or use
  the Android command-line tools.

## One-time setup

```bash
cd mobile/dapp-store

# 1. Initialise the CLI scaffolding (creates ./media if missing).
npx --yes @solana-mobile/dapp-store-cli@latest init

# 2. Drop assets into ./media/ referenced by config.yaml:
#    - icon.png            512x512, the app icon
#    - screenshot-1..n.png 1080x1920 (portrait) device captures
```

Fill in the real values in `config.yaml` (publisher email, website, privacy
policy URL, descriptions). The placeholders there are NEURO-specific defaults.

## Mint publisher → app → release

Each command writes the minted NFT address back into `config.yaml`. Commit the
file after each step so future releases reuse the same identity.

```bash
KEYPAIR=~/.config/solana/dapp-store.json
RPC=https://api.mainnet-beta.solana.com   # or a devnet/QuickNode URL to rehearse

# Publisher (once ever)
npx dapp-store create publisher -k $KEYPAIR -u $RPC

# App (once per app)
npx dapp-store create app -k $KEYPAIR -u $RPC

# Release (once per version) — point at the built APK
npx dapp-store create release \
  -k $KEYPAIR -u $RPC \
  --apk /path/to/neuro-preview.apk
```

## Submit to the publisher portal

```bash
# First submission for this app
npx dapp-store publish submit -k $KEYPAIR -u $RPC \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies

# Subsequent version updates
npx dapp-store publish update -k $KEYPAIR -u $RPC \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies
```

After submission, track status in the
[Publisher Portal](https://publish.solanamobile.com). Review typically completes
within a few business days; you'll be emailed at the publisher address.

## CI note

The APK build is already wired through EAS (`make mobile-build-preview`). The
dApp Store mint/submit steps require a funded keypair and are intentionally **not**
automated in CI — run them locally or from a secured release job so signing keys
never touch shared runners.

## Checklist

- [ ] Release APK built via EAS (`preview` profile → APK).
- [ ] `config.yaml` filled (publisher email, privacy policy URL, descriptions).
- [ ] `./media/icon.png` + 3–8 screenshots added.
- [ ] `create publisher` / `create app` / `create release` run; addresses committed.
- [ ] `publish submit` run with policy-compliance flags.
- [ ] Listing approved in the Publisher Portal.
