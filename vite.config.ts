import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const portalApi = env.VITE_PORTAL_PROXY_TARGET
    || process.env.VITE_PORTAL_PROXY_TARGET
    || 'http://127.0.0.1:3005'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: portalApi,
          changeOrigin: true,
        },
      },
    },
  }
})
