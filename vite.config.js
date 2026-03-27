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
    // One physical copy of wagmi/viem — avoids duplicate context instances.
    dedupe: ['wagmi', 'viem', '@wagmi/core', '@wagmi/connectors', 'react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['wagmi', 'viem', '@wagmi/core', '@wagmi/connectors'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep ALL wagmi + viem + @wagmi in one dedicated chunk so their
          // internal circular-dep initialization order stays deterministic and
          // never hits a TDZ ("Cannot access 'X' before initialization").
          // NOTE: do NOT split wagmi from viem — they import each other and
          // splitting them is what originally caused this crash.
          if (
            id.includes('/node_modules/wagmi/') ||
            id.includes('/node_modules/@wagmi/') ||
            id.includes('/node_modules/viem/') ||
            id.includes('/node_modules/@tanstack/react-query') ||
            id.includes('/node_modules/@tanstack/query-core')
          ) {
            return 'vendor-wagmi';
          }
          // Keep React in its own chunk — prevents "createContext of undefined"
          // when react-query renders before React is ready.
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
});
