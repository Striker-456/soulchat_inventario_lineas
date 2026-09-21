import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // URL donde corre la API (.NET) en desarrollo. Ver backend/SoulChat.Api/Properties/launchSettings.json
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:5095'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      // 5173 ya está permitido por el CORS por defecto del backend.
      port: 5173,
      proxy: {
        // El front llama a /api/* y Vite lo reenvía a la API sin el prefijo /api.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  }
})
