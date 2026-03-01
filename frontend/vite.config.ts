import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'sacral-merry-nonperforming.ngrok-free.dev',
    ],
    proxy: {
      '/auth': 'http://localhost:8000',
      '/curriculum': 'http://localhost:8000',
      '/questions': 'http://localhost:8000',
      '/stats': 'http://localhost:8000',
      '/static': 'http://localhost:8000', // for image uploads if applicable
    }
  },
})
