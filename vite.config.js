import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:     resolve(__dirname, 'index.html'),
        admin:    resolve(__dirname, 'admin/index.html'),
        browse:   resolve(__dirname, 'browse/index.html'),
        specimen: resolve(__dirname, 'specimen/index.html'),
        map:      resolve(__dirname, 'map/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: '/admin/',
  },
});
