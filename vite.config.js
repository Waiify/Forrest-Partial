import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { VITE_RECAPTCHA_SITE_KEY } = loadEnv(mode, './server', 'VITE_')

  return {
    define: VITE_RECAPTCHA_SITE_KEY
      ? {
          'import.meta.env.VITE_RECAPTCHA_SITE_KEY': JSON.stringify(VITE_RECAPTCHA_SITE_KEY),
        }
      : {},
    plugins: [react(), tailwindcss()],
  }
})
