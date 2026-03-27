import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.spec.js'],
    globals: true,
  },
  server: {
    host: '::',
    port: 3003,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Ensure only one copy of wagmi/viem is resolved — prevents TDZ crashes
    // ("Cannot access 'X' before initialization") caused by Rollup loading
    // multiple instances of wagmi-internal modules in different chunk order.
    dedupe: ['wagmi', 'viem', '@wagmi/core', '@wagmi/connectors'],
  },
  // Force Vite to pre-bundle wagmi + viem so their module initialization order
  // is fixed at build time and not subject to Rollup's chunk-ordering heuristics.
  optimizeDeps: {
    include: [
      'wagmi',
      'viem',
      '@wagmi/core',
      '@wagmi/connectors',
    ],
  },
  build: {
    // Avoid manualChunks: splitting wagmi/viem caused "Cannot access 'pT' before initialization";
    // splitting react/react-query caused "createContext" of undefined. Use default chunking.
    chunkSizeWarningLimit: 600,
  },
});
