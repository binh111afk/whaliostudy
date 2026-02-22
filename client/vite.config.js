import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Whalio Study',
        short_name: 'Whalio',
        description: 'Nền tảng hỗ trợ học tập cho sinh viên.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname === '/api' ||
              url.pathname.startsWith('/api/') ||
              url.pathname === '/auth' ||
              url.pathname.startsWith('/auth/'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-auth-network-only',
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'], // Fix lỗi Invalid hook call do duplicate React
    alias: {
      // Force all packages to use React from client/node_modules
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  server: {
    // Proxy configuration cho local development
    // Khi chạy dev server, các request bắt đầu bằng /api sẽ được forward đến backend
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // URL của backend local
        changeOrigin: true,
        secure: false,
        // Nếu backend của bạn chạy ở port khác, thay đổi target ở đây
        // Ví dụ: target: 'http://localhost:5000'
      },
    },
  },
})
