import { useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { rpcEndpoint } from '@/lib/solanaConfig';

import '@solana/wallet-adapter-react-ui/styles.css';

import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import Voice from './pages/Voice';
import NotFound from './pages/NotFound';

const App = () => {
  const endpoint = useMemo(() => rpcEndpoint(), []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/voice" element={<Voice />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;
