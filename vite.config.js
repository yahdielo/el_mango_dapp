import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Strip all console.* and debugger statements from production bundles.
  // Scoping to `command === 'build'` keeps console output available in `vite dev`.
  esbuild: {
    drop: command === 'build' ? ['console', 'debugger'] : [],
  },
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
      // treeshake: 'safest' preserves all module-level side-effects so wagmi/reown
      // initialization code is never removed by tree-shaking.
      treeshake: 'safest',
      output: {
        // externalLiveBindings: false — use plain variable refs instead of getter-based
        // live bindings for cross-chunk exports. Combined with hoistTransitiveImports: false
        // this lets Rollup produce a stable initialization order for circular-dep packages
        // (wagmi, viem, @reown) without triggering TDZ.
        // DO NOT force wagmi/viem/@reown into a single manualChunk — that forces Rollup to
        // linearize their circular dependency graph, which picks the wrong order → TDZ.
        // Instead, let Rollup auto-chunk them; it handles circular deps correctly when given
        // freedom to create natural split points.
        externalLiveBindings: false,
        hoistTransitiveImports: false,
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

          // Stable vendor chunks for large, non-circular libraries.
          // wagmi / viem / @reown / @walletconnect are intentionally NOT listed here —
          // forcing them into a single chunk creates TDZ in Vercel's build environment.
          if (id.includes('/node_modules/@tanstack/')) return 'vendor-tanstack';
          if (id.includes('/node_modules/date-fns')) return 'vendor-date';
        },
      },
    },
  },
}));
