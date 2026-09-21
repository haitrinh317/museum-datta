import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  cacheDir: '.vite_cache',
  root: '.',
  resolve: {
    alias: {
      'node-fetch': resolve(__dirname, 'src/vendor/mindar/browser-node-fetch.js'),
      'string_decoder': resolve(__dirname, 'src/vendor/mindar/browser-string-decoder.js'),
      'util': resolve(__dirname, 'src/vendor/mindar/browser-util.js'),
      'fs': resolve(__dirname, 'src/vendor/mindar/browser-fs.js'),
    },
  },
  publicDir: 'public',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      scope: '/',
      workbox: {
        // Precache build output — exclude admin
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,webp,woff2,mind}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globIgnores: ['admin/**', '**/logo*.png', '**/og-image*.png', '**/hero_bg.png'],
        // Offline navigation fallback
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/admin/, /\.[a-zA-Z0-9]+$/],
        // ponytail: MPA with query params (?code=XXX) — strip ALL params when matching precache
        ignoreURLParametersMatching: [/./],
        // Runtime cache strategies
        runtimeCaching: [
          {
            // Assets WebAR local (ảnh target, model, video)
            urlPattern: /\/ar\/.*\.(?:jpg|jpeg|png|webp|webm|mp4|mind)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ar-assets',
              expiration: { maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Ảnh mẫu vật từ Supabase Storage
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'specimen-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }
            }
          },
          {
            // Google Fonts files (woff2)
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-woff',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Esri satellite tiles
            urlPattern: /^https:\/\/server\.arcgisonline\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      manifest: {
        name: 'Bảo tàng Hải dương học — CSDL Mẫu vật',
        short_name: 'Bảo tàng HDH',
        description: 'Tra cứu thông tin mẫu vật sinh vật biển trưng bày tại Bảo tàng Hải dương học',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0a1628',
        theme_color: '#0a1628',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:     resolve(__dirname, 'index.html'),
        admin:    resolve(__dirname, 'admin/index.html'),
        browse:   resolve(__dirname, 'browse/index.html'),
        specimen:  resolve(__dirname, 'specimen/index.html'),
        map:       resolve(__dirname, 'map/index.html'),
        ar:        resolve(__dirname, 'ar/index.html'),
        ar_target: resolve(__dirname, 'ar/target/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: '/admin/',
  },
});
