import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '여행 지도',
        short_name: '여행 지도',
        description: '구글 지도 기반 여행 계획/장소 관리 앱',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Google Maps' own tile/script requests should always hit the
        // network, not be intercepted by the service worker.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin.includes('googleapis.com') || url.origin.includes('gstatic.com'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
