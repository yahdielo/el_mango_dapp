import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '::',
    port: 3003,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@reown/appkit') || id.includes('@reown/appkit-adapter')) return 'reown';
            if (id.includes('wagmi') || id.includes('viem')) return 'wagmi-viem';
            if (id.includes('metamask')) return 'metamask-sdk';
            // Keep React, react-dom, react-router, and @tanstack/react-query together so
            // react-query always has React (createContext) available; splitting them caused
            // "Cannot read properties of undefined (reading 'createContext')".
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
