import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss()
    ],

    server: {
      allowedHosts: [
        env.VITE_CLOUDFLARED_URL,
      ],
    },

    // `npm test`: components render in a fake browser (jsdom)
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/browser-apis.js', './src/test/setup.js'],
    },
  }
})