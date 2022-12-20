import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api':  'http://localhost:8080'
    }
  },
  plugins: [preact()],
})
