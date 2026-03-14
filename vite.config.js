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
    // Avoid manualChunks: splitting wagmi/viem caused "Cannot access 'pT' before initialization";
    // splitting react/react-query caused "createContext" of undefined. Use default chunking.
    chunkSizeWarningLimit: 600,
  },
});
