import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/tailor': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/resumes': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/coverletters': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/applications': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/saved-jobs': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/settings': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/profile': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/notifications': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/interviews': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/ats': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/semantic-ats': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/emails': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})
