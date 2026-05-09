import React, { createContext, useContext, ReactNode } from "react";
import { useWalletStore } from "../store/walletStore";

interface WalletContextType {
  connected: boolean;
  address: string | null;
  connect: (walletName?: string) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  address: null,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const { connected, address, connect, disconnect } = useWalletStore();

  return (
    <WalletContext.Provider value={{ connected, address, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
