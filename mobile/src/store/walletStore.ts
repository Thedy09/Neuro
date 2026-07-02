import { create } from "zustand";
import {
  transact,
  Web3MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";

// Cluster is env-driven: "devnet" (default) or "mainnet-beta" (production).
// RPC and program ID must be set consistently with the cluster at build time.
const RAW_CLUSTER = (process.env.EXPO_PUBLIC_SOLANA_CLUSTER || "devnet")
  .trim()
  .toLowerCase();
export const SOLANA_CLUSTER: "devnet" | "testnet" | "mainnet-beta" =
  RAW_CLUSTER === "mainnet-beta" || RAW_CLUSTER === "mainnet"
    ? "mainnet-beta"
    : RAW_CLUSTER === "testnet"
    ? "testnet"
    : "devnet";
export const IS_MAINNET = SOLANA_CLUSTER === "mainnet-beta";
export const CLUSTER_LABEL = IS_MAINNET
  ? "mainnet"
  : SOLANA_CLUSTER === "testnet"
  ? "testnet"
  : "devnet";

export function explorerTxUrl(signature: string): string {
  const suffix = IS_MAINNET ? "" : `?cluster=${SOLANA_CLUSTER}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}

const RPC_URL =
  process.env.EXPO_PUBLIC_SOLANA_RPC ||
  (IS_MAINNET
    ? "https://api.mainnet-beta.solana.com"
    : `https://api.${SOLANA_CLUSTER}.solana.com`);
const PROGRAM_ID_STR =
  process.env.EXPO_PUBLIC_PROGRAM_ID ||
  "E7RAJWfEmSAm3NRR4Z2YBqw27fTGazBY2eGzypmFoCnT";
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

const connection = new Connection(RPC_URL, "confirmed");

export function getVaultPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), Buffer.from("vault")],
    new PublicKey(PROGRAM_ID_STR)
  );
}

function decodeMwaAddress(account: unknown): PublicKey {
  const candidate = account as {
    address?: string;
    publicKey?: unknown;
  };

  const pk = candidate.publicKey;
  if (pk instanceof PublicKey) return pk;
  if (pk && typeof pk === "object" && "length" in (pk as object)) {
    try {
      return new PublicKey(pk as Uint8Array);
    } catch {
      // fall through
    }
  }

  const raw = candidate.address;
  if (typeof raw === "string") {
    try {
      return new PublicKey(Buffer.from(raw, "base64"));
    } catch {
      return new PublicKey(raw);
    }
  }

  throw new Error("Wallet account has no usable address");
}

interface WalletState {
  connected: boolean;
  address: string | null;
  publicKey: PublicKey | null;
  authToken: string | null;
  solBalance: number | null;
  vaultAddress: string | null;
  lastTxSignature: string | null;

  connect: (walletName?: string) => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAndSendTransaction: (tx: Transaction) => Promise<string>;
  airdropDevnet: () => Promise<string>;
  signMemoAndDepositVault: (memo: string, lamports: number) => Promise<string>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  connected: false,
  address: null,
  publicKey: null,
  authToken: null,
  solBalance: null,
  vaultAddress: null,
  lastTxSignature: null,

  connect: async () => {
    try {
      await transact(async (wallet: Web3MobileWallet) => {
        const authResult = await wallet.authorize({
          cluster: SOLANA_CLUSTER,
          identity: {
            name: "NEURO",
            uri: "https://neuro.app",
            icon: "favicon.ico",
          },
        });

        const account = authResult.accounts[0];
        if (!account) {
          throw new Error("No account returned by wallet");
        }

        const pubkey = decodeMwaAddress(account);
        const [vaultPda] = getVaultPda(pubkey);

        set({
          connected: true,
          address: pubkey.toBase58(),
          publicKey: pubkey,
          authToken: authResult.auth_token,
          vaultAddress: vaultPda.toBase58(),
        });
      });

      await get().refreshBalance();
    } catch (error) {
      console.error("Wallet connection failed:", error);
      throw error;
    }
  },

  disconnect: () => {
    set({
      connected: false,
      address: null,
      publicKey: null,
      authToken: null,
      solBalance: null,
      vaultAddress: null,
      lastTxSignature: null,
    });
  },

  refreshBalance: async () => {
    const { publicKey } = get();
    if (!publicKey) return;
    try {
      const lamports = await connection.getBalance(publicKey);
      set({ solBalance: lamports / LAMPORTS_PER_SOL });
    } catch (error) {
      console.warn("getBalance failed:", error);
    }
  },

  signTransaction: async (tx: Transaction) => {
    const { authToken } = get();
    if (!authToken) throw new Error("Not connected");

    let signedTx: Transaction = tx;

    await transact(async (wallet: Web3MobileWallet) => {
      await wallet.reauthorize({
        auth_token: authToken,
        identity: { name: "NEURO", uri: "https://neuro.app", icon: "favicon.ico" },
      });
      const result = await wallet.signTransactions({
        transactions: [tx],
      });
      signedTx = result[0];
    });

    return signedTx;
  },

  signAndSendTransaction: async (tx: Transaction) => {
    const { authToken } = get();
    if (!authToken) throw new Error("Not connected");

    let signature = "";

    await transact(async (wallet: Web3MobileWallet) => {
      await wallet.reauthorize({
        auth_token: authToken,
        identity: { name: "NEURO", uri: "https://neuro.app", icon: "favicon.ico" },
      });
      const result = await wallet.signAndSendTransactions({
        transactions: [tx],
      });
      const raw = result[0] as unknown;
      signature =
        typeof raw === "string"
          ? raw
          : bs58.encode(raw as Uint8Array);
    });

    set({ lastTxSignature: signature });
    return signature;
  },

  airdropDevnet: async () => {
    if (IS_MAINNET) throw new Error("Airdrop is not available on mainnet");
    const { publicKey } = get();
    if (!publicKey) throw new Error("Not connected");
    const sig = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    set({ lastTxSignature: sig });
    await get().refreshBalance();
    return sig;
  },

  signMemoAndDepositVault: async (memo: string, lamports: number) => {
    const { publicKey } = get();
    if (!publicKey) throw new Error("Not connected");

    const [vaultPda] = getVaultPda(publicKey);

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: false },
        ],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, "utf8"),
      }),
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: vaultPda,
        lamports,
      })
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = publicKey;

    const signature = await get().signAndSendTransaction(tx);
    await get().refreshBalance();
    return signature;
  },
}));
