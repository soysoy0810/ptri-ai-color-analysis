import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ptri-AI-color-analysis/frontend/dist/',
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
