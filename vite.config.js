import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      scope: '/',
      workbox: {
        // Precache build output — exclude admin
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        globIgnores: ['admin/**', '**/logo*.png', '**/og-image*.png', '**/hero_bg.png'],
        // Offline navigation fallback
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/admin/],
        // ponytail: MPA with query params (?code=XXX) — strip ALL params when matching precache
        ignoreURLParametersMatching: [/./],
        // Runtime cache strategies
        runtimeCaching: [
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
            // Supabase REST API (browse listing, specimen detail)
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
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
