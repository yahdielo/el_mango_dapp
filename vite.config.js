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
            if (id.includes('@tanstack/react-query')) return 'react-query';
            if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
            if (id.includes('metamask')) return 'metamask-sdk';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
