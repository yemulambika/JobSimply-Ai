import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/tailor': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/resumes': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/coverletters': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/applications': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/saved-jobs': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/settings': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/profile': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/notifications': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/interviews': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/ats': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/emails': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
