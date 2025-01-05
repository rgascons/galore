import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { BASE_DIR } from './constants';

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  server: {
    port: 3000,
  },
  base: BASE_DIR,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './public/assets')
    }
  },
  publicDir: 'public',
});