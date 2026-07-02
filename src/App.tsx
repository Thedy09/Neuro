import { lazy, Suspense, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { rpcEndpoint } from '@/lib/solanaConfig';

import '@solana/wallet-adapter-react-ui/styles.css';

import Index from './pages/Index';

// Route-level code splitting: Dashboard and Voice pull in heavy deps
// (charts, audio pipeline) that the landing page should not pay for.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Voice = lazy(() => import('./pages/Voice'));
const NotFound = lazy(() => import('./pages/NotFound'));

const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 text-primary animate-spin" aria-label="Loading page" />
  </div>
);

const App = () => {
  const endpoint = useMemo(() => rpcEndpoint(), []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <MotionConfig reducedMotion="user">
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/voice" element={<Voice />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <Toaster />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </MotionConfig>
  );
};

export default App;
