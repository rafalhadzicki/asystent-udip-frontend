import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  // The session cookie needs same-origin requests, so in development the API
  // is reached through this server (VITE_API_BASE_URL points at it).
  const backendUrl = loadEnv(mode, process.cwd(), '').BACKEND_URL
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@mui/styled-engine': '@mui/styled-engine-sc',
      },
    },
    server: backendUrl
      ? {
          proxy: {
            '/api': {
              target: backendUrl,
              changeOrigin: true,
              headers: { 'ngrok-skip-browser-warning': 'true' },
            },
          },
        }
      : undefined,
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      clearMocks: true,
      env: { VITE_API_BASE_URL: 'https://api.example.test' },
    },
  }
})
