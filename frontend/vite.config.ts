import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: process.env.VITE_ALLOWED_HOSTS
      ? process.env.VITE_ALLOWED_HOSTS.split(',').map((v) => v.trim()).filter(Boolean)
      : [],
    proxy: {
      '/auth': 'http://localhost:8000',
      '/curriculum': 'http://localhost:8000',
      '/questions': 'http://localhost:8000',
      '/stats': 'http://localhost:8000',
      '/static': 'http://localhost:8000', // for image uploads if applicable
      '/allowed-subjects': 'http://localhost:8000',
      '/allowed-grades': 'http://localhost:8000',
    }
  },
})
