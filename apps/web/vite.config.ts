import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    restoreMocks: true,
    clearMocks: true,
  },
  server: {
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:4000',
      '/socket.io': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:4000', ws: true },
    },
  },
});
