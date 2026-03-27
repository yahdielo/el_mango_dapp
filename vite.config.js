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
    chunkSizeWarningLimit: 4096,
    rollupOptions: {
      // 'safest' preserves all module-level side-effects / initialization code.
      // Without this, Rollup tree-shakes wagmi internals and the remaining
      // stubs reference const/let that were removed → TDZ at runtime.
      treeshake: 'safest',
      output: {
        manualChunks(id) {
          // Only process node_modules
          if (!id.includes('node_modules')) return;

          // React must be isolated — splitting it causes "createContext of undefined"
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }

          // EVERYTHING else from node_modules goes into one chunk.
          // This prevents wagmi/viem/@reown from ever landing in a lazy app
          // chunk where Rollup cannot guarantee initialization order,
          // which is the root cause of "Cannot access 'X' before initialization".
          return 'vendor';
        },
      },
    },
  },
});
