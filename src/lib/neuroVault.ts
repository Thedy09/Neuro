/**
 * NEURO Vault SDK
 *
 * Production-ready TypeScript SDK for the neuro_vault Solana program.
 * Handles initialize_vault, update_risk, deposit_tracking instructions
 * with full PDA derivation, error handling, and account fetching.
 */

import { BN, Program, Provider, type Idl } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import IDL from "../idl/neuroVaultIDL.json";

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserVaultData {
  owner: PublicKey;
  riskToleranceScore: number;
  totalDeposited: BN;
  bump: number;
  createdAt: BN;
}

export interface SDKResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface InitializeVaultParams {
  riskScore: number;
}

export interface UpdateRiskParams {
  newScore: number;
}

export interface DepositTrackingParams {
  /** Amount in lamports */
  amount: number;
}

// ── SDK ───────────────────────────────────────���──────────────────────────────

export class NeuroVaultSDK {
  private readonly provider: Provider;
  private readonly program: Program<Idl>;

  constructor(provider: Provider) {
    this.provider = provider;
    this.program = new Program(IDL as Idl, provider);
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private safeBN(value: unknown, defaultValue: number | string = 0): BN {
    if (value === null || value === undefined) return new BN(defaultValue);
    if (value instanceof BN) return value;
    if (typeof value === "number") {
      if (isNaN(value) || !isFinite(value)) return new BN(defaultValue);
      return new BN(Math.floor(Math.abs(value)).toString());
    }
    if (typeof value === "string") {
      const parsed = parseFloat(value.trim());
      if (isNaN(parsed)) return new BN(defaultValue);
      return new BN(Math.floor(Math.abs(parsed)).toString());
    }
    return new BN(defaultValue);
  }

  private safeBNToNumber(value: unknown, defaultValue: number = 0): number {
    try {
      if (value && typeof value.toNumber === "function") return value.toNumber();
      if (value && typeof value.toString === "function") {
        const parsed = parseInt(value.toString());
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private solToLamports(sol: number): BN {
    return this.safeBN(Math.floor(sol * LAMPORTS_PER_SOL));
  }

  private lamportsToSol(lamports: BN): number {
    return this.safeBNToNumber(lamports, 0) / LAMPORTS_PER_SOL;
  }

  private async testConnection(): Promise<boolean> {
    try {
      if (!this.provider?.connection) return false;
      const { value } = await this.provider.connection.getLatestBlockhashAndContext("finalized");
      return !!(value && value.blockhash);
    } catch {
      return false;
    }
  }

  // ── PDA Derivation ───────────────────────────────────────────────────

  /**
   * Derive the PDA address for a user's vault.
   * Seeds: [user_pubkey, "vault"]
   */
  getVaultPDA(userPubkey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [userPubkey.toBuffer(), Buffer.from("vault")],
      this.program.programId,
    );
  }

  // ── Account Fetching ─────────────────────────────────────────────────

  /**
   * Fetch on-chain vault data for a user.
   * Returns null if vault doesn't exist yet.
   */
  async fetchVault(userPubkey?: PublicKey): Promise<SDKResult<UserVaultData | null>> {
    const target = userPubkey || this.provider.publicKey;
    if (!target) return { success: false, error: "No wallet connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const [vaultAddress] = this.getVaultPDA(target);

      const accountInfo = await this.provider.connection.getAccountInfo(vaultAddress);
      if (!accountInfo) {
        return { success: true, data: null }; // Vault not initialized
      }

      try {
        const decoded = this.program.coder.accounts.decode("UserVault", accountInfo.data);
        const vaultData: UserVaultData = {
          owner: decoded.owner || target,
          riskToleranceScore:
            typeof decoded.riskToleranceScore === "number"
              ? decoded.riskToleranceScore
              : typeof decoded.risk_tolerance_score === "number"
                ? decoded.risk_tolerance_score
              : 0,
          totalDeposited: this.safeBN(decoded.totalDeposited ?? decoded.total_deposited, 0),
          bump: typeof decoded.bump === "number" ? decoded.bump : 0,
          createdAt: this.safeBN(decoded.createdAt ?? decoded.created_at, 0),
        };
        return { success: true, data: vaultData };
      } catch (decodeError) {
        console.error("Vault decode failed:", decodeError);
        return { success: false, error: "Failed to decode vault data" };
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Account does not exist")) {
        return { success: true, data: null };
      }
      console.error("fetchVault error:", error);
      return { success: false, error: "Failed to fetch vault" };
    }
  }

  /**
   * Check if a vault exists for the given user.
   */
  async vaultExists(userPubkey?: PublicKey): Promise<SDKResult<boolean>> {
    const result = await this.fetchVault(userPubkey);
    if (!result.success) return { success: false, error: result.error };
    return { success: true, data: result.data !== null };
  }

  /**
   * Fetch SOL balance for an account.
   */
  async fetchSolBalance(account?: PublicKey): Promise<SDKResult<number>> {
    const target = account || this.provider.publicKey;
    if (!target) return { success: false, error: "No account provided" };
    try {
      const balance = await this.provider.connection.getBalance(target);
      return { success: true, data: balance / LAMPORTS_PER_SOL };
    } catch {
      return { success: false, error: "Failed to fetch SOL balance" };
    }
  }

  // ── Instructions ─────────────────────────────────────────────────────

  /**
   * Initialize a new PDA vault for the connected wallet.
   * @param params.riskScore Risk tolerance 0-100
   */
  async initializeVault(
    params: InitializeVaultParams,
  ): Promise<SDKResult<{ signature: string; vaultAddress: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      // Validate
      if (params.riskScore < 0 || params.riskScore > 100)
        return { success: false, error: "Risk score must be 0-100" };

      // Check if vault already exists
      const existsResult = await this.vaultExists();
      if (existsResult.success && existsResult.data) {
        return { success: false, error: "Vault already exists for this wallet" };
      }

      const [vaultAddress] = this.getVaultPDA(this.provider.publicKey);

      const tx = await this.program.methods
        .initializeVault(params.riskScore)
        .accounts({
          owner: this.provider.publicKey,
          vault: vaultAddress,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return {
        success: true,
        data: { signature: tx, vaultAddress: vaultAddress.toString() },
      };
    } catch (error) {
      console.error("initializeVault error:", error);
      const msg = error instanceof Error ? error.message : "Failed to initialize vault";
      if (msg.includes("already in use"))
        return { success: false, error: "Vault already exists" };
      return { success: false, error: msg };
    }
  }

  /**
   * Update risk tolerance score for the connected wallet's vault.
   * @param params.newScore New risk tolerance 0-100
   */
  async updateRisk(
    params: UpdateRiskParams,
  ): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      if (params.newScore < 0 || params.newScore > 100)
        return { success: false, error: "Risk score must be 0-100" };

      const [vaultAddress] = this.getVaultPDA(this.provider.publicKey);

      const tx = await this.program.methods
        .updateRisk(params.newScore)
        .accounts({
          owner: this.provider.publicKey,
          vault: vaultAddress,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error) {
      console.error("updateRisk error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update risk",
      };
    }
  }

  /**
   * Track a deposit amount in the vault ledger.
   * @param params.amount Amount in lamports
   */
  async depositTracking(
    params: DepositTrackingParams,
  ): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      if (params.amount <= 0)
        return { success: false, error: "Amount must be greater than 0" };

      const [vaultAddress] = this.getVaultPDA(this.provider.publicKey);
      const amountBN = this.safeBN(params.amount);

      const tx = await this.program.methods
        .depositTracking(amountBN)
        .accounts({
          owner: this.provider.publicKey,
          vault: vaultAddress,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error) {
      console.error("depositTracking error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to track deposit",
      };
    }
  }

  // ── Utility ──────────────────────────────────────────────────────────

  /** Get the program ID */
  get programId(): PublicKey {
    return this.program.programId;
  }

  /** Convert lamports to SOL */
  toSol(lamports: BN | number): number {
    if (typeof lamports === "number") return lamports / LAMPORTS_PER_SOL;
    return this.lamportsToSol(lamports);
  }

  /** Convert SOL to lamports */
  toLamports(sol: number): number {
    return Math.floor(sol * LAMPORTS_PER_SOL);
  }
}
