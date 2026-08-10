import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves a project site from a subpath (/<repo>/), while Vercel,
// Netlify and friends serve from the root. Driven by an env var so one build
// setup covers both without editing code to move hosts.
const base = process.env.VITE_BASE_PATH ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  // Baked into the bundle so the in-app diagnostics can say exactly which
  // build is running -- otherwise a bug report can't be matched to a commit,
  // and a stale service worker looks identical to a fresh one.
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_COMMIT__: JSON.stringify((process.env.GITHUB_SHA ?? 'dev').slice(0, 7)),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '여행 지도',
        short_name: '여행 지도',
        description: '구글 지도 기반 여행 계획/장소 관리 앱',
        // Must follow the base, or an installed icon on a project-site
        // deployment launches to a 404 instead of the app.
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}icons/maskable-192.png`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: `${base}icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
