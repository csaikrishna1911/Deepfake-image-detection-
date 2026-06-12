import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    watch: {
      ignored: ['.venv', 'venv', 'venv_gpu', 'dataset', 'model', '__pycache__']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  optimizeDeps: {
    exclude: ['.venv', 'venv', 'venv_gpu']
  }
})
