import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/three.js-master/**', '**/.git/**'],
    },
  },
  optimizeDeps: {
    entries: ['src/main.jsx'],
  },
})
