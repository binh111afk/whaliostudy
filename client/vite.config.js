import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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