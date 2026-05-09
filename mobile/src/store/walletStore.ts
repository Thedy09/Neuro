import { create } from "zustand";
import {
  transact,
  Web3MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";

interface WalletState {
  connected: boolean;
  address: string | null;
  publicKey: PublicKey | null;
  authToken: string | null;

  connect: (walletName?: string) => Promise<void>;
  disconnect: () => void;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAndSendTransaction: (tx: Transaction) => Promise<string>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  connected: false,
  address: null,
  publicKey: null,
  authToken: null,

  connect: async () => {
    try {
      await transact(async (wallet: Web3MobileWallet) => {
        const authResult = await wallet.authorize({
          cluster: "devnet",
          identity: {
            name: "NEURO",
            uri: "https://neuro.app",
            icon: "favicon.ico",
          },
        });

        const pubkey = new PublicKey(authResult.accounts[0].address);

        set({
          connected: true,
          address: pubkey.toBase58(),
          publicKey: pubkey,
          authToken: authResult.auth_token,
        });
      });
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
    });
  },

  signTransaction: async (tx: Transaction) => {
    const { authToken } = get();
    if (!authToken) throw new Error("Not connected");

    let signedTx: Transaction = tx;

    await transact(async (wallet: Web3MobileWallet) => {
      await wallet.reauthorize({ auth_token: authToken });
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
      await wallet.reauthorize({ auth_token: authToken });
      const result = await wallet.signAndSendTransactions({
        transactions: [tx],
      });
      signature = bs58.encode(result[0]);
    });

    return signature;
  },
}));
