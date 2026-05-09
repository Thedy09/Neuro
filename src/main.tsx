import { Buffer } from 'buffer';

// Bundled polyfills for Solana libs (avoid esm.sh in index.html — breaks some prod / CSP setups)
(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
(window as unknown as { global: Window }).global = window;
(window as unknown as { process: { env: Record<string, string> } }).process = { env: {} };

import './index.css';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
    <BrowserRouter>
        <App />
    </BrowserRouter>,
);
