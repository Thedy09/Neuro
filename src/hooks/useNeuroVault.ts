/**
 * useNeuroVault — React hook for on-chain NEURO vault interactions
 *
 * Provides:
 * - SDK instance (memoized by provider)
 * - Vault data fetching with auto-refresh
 * - initializeVault / updateRisk / depositTracking mutation wrappers
 * - SOL balance
 * - Loading & error states
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, type Wallet } from "@coral-xyz/anchor";
import { NeuroVaultSDK, type UserVaultData, type SDKResult } from "@/lib/neuroVault";

export interface UseNeuroVaultReturn {
  sdk: NeuroVaultSDK | null;
  ready: boolean;

  vault: UserVaultData | null;
  vaultExists: boolean;
  vaultLoading: boolean;
  vaultError: string | null;

  solBalance: number;

  initializeVault: (riskScore: number) => Promise<SDKResult<{ signature: string; vaultAddress: string }>>;
  updateRisk: (newScore: number) => Promise<SDKResult<{ signature: string }>>;
  depositTracking: (amountLamports: number) => Promise<SDKResult<{ signature: string }>>;

  refreshVault: () => Promise<void>;
  txLoading: boolean;
}

export function useNeuroVault(): UseNeuroVaultReturn {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  // ── Provider + SDK ────────────────────────────────────────────────────
  const anchorWallet = useMemo((): Wallet | null => {
    if (!publicKey || !signTransaction || !signAllTransactions) return null;
    return {
      publicKey,
      signTransaction,
      signAllTransactions,
    } as Wallet;
  }, [publicKey, signTransaction, signAllTransactions]);

  const provider = useMemo(() => {
    if (!anchorWallet) return null;
    return new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
  }, [connection, anchorWallet]);

  const sdk = useMemo(() => {
    if (!provider) return null;
    return new NeuroVaultSDK(provider);
  }, [provider]);

  // ── State ─────────────────────────────────────────────────────────────
  const [vault, setVault] = useState<UserVaultData | null>(null);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [solBalance, setSolBalance] = useState(0);
  const [txLoading, setTxLoading] = useState(false);

  const ready = !!sdk && !!publicKey;

  // ── Fetch vault ───────────────────────────────────────────────────────
  const refreshVault = useCallback(async () => {
    if (!sdk || !publicKey) {
      setVault(null);
      return;
    }

    setVaultLoading(true);
    setVaultError(null);

    try {
      const [vaultResult, balanceResult] = await Promise.all([
        sdk.fetchVault(publicKey),
        sdk.fetchSolBalance(publicKey),
      ]);

      if (vaultResult.success) {
        setVault(vaultResult.data ?? null);
      } else {
        setVaultError(vaultResult.error ?? "Failed to fetch vault");
      }

      if (balanceResult.success) {
        setSolBalance(balanceResult.data ?? 0);
      }
    } catch (err) {
      setVaultError("Unexpected error fetching vault data");
      console.error(err);
    } finally {
      setVaultLoading(false);
    }
  }, [sdk, publicKey]);

  // Auto-fetch when wallet connects/changes
  useEffect(() => {
    refreshVault();
  }, [refreshVault]);

  // ── Mutations ─────────────────────────────────────────────────────────

  const initializeVault = useCallback(
    async (riskScore: number) => {
      if (!sdk)
        return {
          success: false,
          error: "SDK not ready",
        } satisfies SDKResult<{ signature: string; vaultAddress: string }>;
      setTxLoading(true);
      try {
        const result = await sdk.initializeVault({ riskScore });
        if (result.success) {
          await refreshVault(); // reload after success
        }
        return result;
      } finally {
        setTxLoading(false);
      }
    },
    [sdk, refreshVault],
  );

  const updateRisk = useCallback(
    async (newScore: number) => {
      if (!sdk)
        return { success: false, error: "SDK not ready" } satisfies SDKResult<{ signature: string }>;
      setTxLoading(true);
      try {
        const result = await sdk.updateRisk({ newScore });
        if (result.success) {
          await refreshVault();
        }
        return result;
      } finally {
        setTxLoading(false);
      }
    },
    [sdk, refreshVault],
  );

  const depositTracking = useCallback(
    async (amountLamports: number) => {
      if (!sdk)
        return { success: false, error: "SDK not ready" } satisfies SDKResult<{ signature: string }>;
      setTxLoading(true);
      try {
        const result = await sdk.depositTracking({ amount: amountLamports });
        if (result.success) {
          await refreshVault();
        }
        return result;
      } finally {
        setTxLoading(false);
      }
    },
    [sdk, refreshVault],
  );

  return {
    sdk,
    ready,
    vault,
    vaultExists: vault !== null,
    vaultLoading,
    vaultError,
    solBalance,
    initializeVault,
    updateRisk,
    depositTracking,
    refreshVault,
    txLoading,
  };
}
