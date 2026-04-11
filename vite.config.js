import { defineConfig } from 'vite';

export default defineConfig({
  base: '/brain-sim/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  assetsInclude: ['**/*.obj'],
});
