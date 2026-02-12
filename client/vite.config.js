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
    // Thêm đoạn proxy này vào
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Trỏ thẳng về backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
})