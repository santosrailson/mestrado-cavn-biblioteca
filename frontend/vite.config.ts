import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const manifest = {
  name: 'Repositório Digital CAVN',
  short_name: 'CAVN Digital',
  description: 'Acervo histórico, fotográfico e documental do Colégio Agrícola Vidal de Negreiros - CAVN/UFPB',
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#0369a1',
  orientation: 'any',
  lang: 'pt-BR',
  icons: [
    { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['cavn-logo.png', 'og-image.png'],
      manifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.bunny\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bunny-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\/media\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'media-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [200] },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      selfDestroying: false,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]',
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['lucide-react', 'clsx'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/shared/lib/testSetup.ts'],
    css: true,
    exclude: ['**/node_modules/**', '**/e2e/**', '**/*.spec.ts'],
  },
});
