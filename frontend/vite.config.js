import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      webp: { lossless: true },
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws-booking': {
        target: 'http://localhost:8080',
        ws: true,
      },
    },
  },
  define: {
    global: 'window',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge')) return 'ui-vendor';
            if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) return 'redux-vendor';
            return 'vendor';
          }
        }
      }
    }
  }
})
