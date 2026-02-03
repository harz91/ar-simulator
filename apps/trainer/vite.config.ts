import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ar-simulator/shared': path.resolve(
        __dirname,
        '../../packages/shared/src',
      ),
    },
  },
  server: {
    port: 5174,
    host: true,
  },
});
