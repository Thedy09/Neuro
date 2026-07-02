/**
 * Solana cluster configuration — single source of truth for the web app.
 *
 * Set `VITE_SOLANA_CLUSTER` to `mainnet-beta` (production) or `devnet` (default).
 * `VITE_SOLANA_RPC_URL` always takes precedence over the public cluster RPC.
 */

import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

function parseCluster(raw: string | undefined): SolanaCluster {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'mainnet-beta' || value === 'mainnet') return 'mainnet-beta';
  if (value === 'testnet') return 'testnet';
  return 'devnet';
}

export const SOLANA_CLUSTER: SolanaCluster = parseCluster(
  import.meta.env.VITE_SOLANA_CLUSTER,
);

export const IS_MAINNET = SOLANA_CLUSTER === 'mainnet-beta';

export const CLUSTER_LABEL = IS_MAINNET
  ? 'Mainnet'
  : SOLANA_CLUSTER === 'testnet'
    ? 'Testnet'
    : 'Devnet';

export const WALLET_ADAPTER_NETWORK: WalletAdapterNetwork = IS_MAINNET
  ? WalletAdapterNetwork.Mainnet
  : SOLANA_CLUSTER === 'testnet'
    ? WalletAdapterNetwork.Testnet
    : WalletAdapterNetwork.Devnet;

export function rpcEndpoint(): string {
  const custom = import.meta.env.VITE_SOLANA_RPC_URL;
  if (custom && custom.trim() !== '') return custom.trim();
  return clusterApiUrl(WALLET_ADAPTER_NETWORK);
}

/** Solana Explorer URL for a transaction, on the configured cluster. */
export function explorerTxUrl(signature: string): string {
  const suffix = IS_MAINNET ? '' : `?cluster=${SOLANA_CLUSTER}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}

/** Solana Explorer URL for an address, on the configured cluster. */
export function explorerAddressUrl(address: string): string {
  const suffix = IS_MAINNET ? '' : `?cluster=${SOLANA_CLUSTER}`;
  return `https://explorer.solana.com/address/${address}${suffix}`;
}
