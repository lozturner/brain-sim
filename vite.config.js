import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // Only prefix paths for production build (GitHub Pages lives at /brain-sim/)
  // In dev mode use '/' so local model fetches resolve correctly
  base: command === 'build' ? '/brain-sim/' : '/',
  server: {
    port: 5174,
    strictPort: true,
    host: true, // expose on LAN as well
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  assetsInclude: ['**/*.obj'],
}));
