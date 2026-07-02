import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    watch: { usePolling: true }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks: better browser caching and a smaller entry bundle
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-solana': [
            '@solana/web3.js',
            '@solana/wallet-adapter-react',
            '@solana/wallet-adapter-react-ui',
            '@solana/wallet-adapter-wallets',
          ],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
}) 