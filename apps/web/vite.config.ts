import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Козёл',
        short_name: 'Козёл',
        description: 'Карточная игра «Козёл» для друзей',
        theme_color: '#0e3b2e',
        background_color: '#0e3b2e',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'ru',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|svg|css|js|woff2)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'kozel-static' },
          },
        ],
      },
    }),
  ],
  server: { port: 5173, host: '0.0.0.0' },
  build: { outDir: 'dist', sourcemap: true },
});
