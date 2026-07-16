import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const manifest = {
  name: 'Repositório Digital CAVN',
  short_name: 'CAVN Digital',
  description:
    'Acervo histórico, fotográfico e documental do Colégio Agrícola Vidal de Negreiros - CAVN/UFPB',
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

const isE2ERuntime = process.env.CAVN_E2E === 'true';

function e2eApiMockPlugin(): Plugin {
  return {
    name: 'cavn-e2e-api-mock',
    transformIndexHtml(html) {
      return html
        .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.bunny\.net" \/>/, '')
        .replace(/\s*<link\s+rel="stylesheet"\s+href="https:\/\/fonts\.bunny\.net[^>]+\/>/, '');
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = request.url ?? '';
        if (!requestUrl.startsWith('/api/v1/')) {
          next();
          return;
        }

        const path = requestUrl.split('?')[0];
        if (request.method === 'OPTIONS') {
          response.statusCode = 204;
          response.end();
          return;
        }

        response.setHeader('Content-Type', 'application/json');
        if (path.includes('/auth/me/') || path.includes('/auth/refresh/')) {
          response.statusCode = 401;
          response.end(JSON.stringify({ detail: 'Unauthorized' }));
          return;
        }

        if (path.includes('/analytics/')) {
          response.statusCode = 204;
          response.end();
          return;
        }

        if (path.includes('/galeria/')) {
          response.statusCode = 200;
          response.end('[]');
          return;
        }

        response.statusCode = 200;
        response.end(
          JSON.stringify(
            path.includes('/config/') ||
              path.includes('/categorias/') ||
              path.includes('/timeline/')
              ? []
              : { count: 0, next: null, previous: null, results: [] }
          )
        );
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    ...(isE2ERuntime ? [e2eApiMockPlugin()] : []),
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
    // Os testes E2E mockam as chamadas da API no navegador. Manter o proxy
    // ativo nesse cenário cria ruído e uma dependência desnecessária de um
    // backend local no runner do CI.
    proxy: isE2ERuntime
      ? undefined
      : {
          '/api/v1': {
            target: 'http://localhost:8000',
            changeOrigin: true,
          },
        },
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'e2e/', '**/*.d.ts', '**/*.config.*', 'src/main.tsx'],
    },
  },
});
