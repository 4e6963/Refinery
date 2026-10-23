import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Refinery – Abrechnungen zu Excel',
        short_name: 'Refinery',
        description: 'Liest Abrechnungs-PDFs im Browser und erzeugt eine Jahres-Excel. Alle Daten bleiben auf dem Gerät.',
        lang: 'de',
        theme_color: '#1f4e5f',
        background_color: '#f6f7f9',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,webmanifest}'],
        // pdf.js and ExcelJS are large; they must be precached for offline use.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: 'index.html',
        // Take control immediately so the first visit already works offline.
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 3000,
  },
})
