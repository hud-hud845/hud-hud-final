import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public', // Menjamin folder public di-copy ke dist
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets', // Mengorganisir aset agar tidak berantakan
  },
  server: {
    port: 3000,
  }
});