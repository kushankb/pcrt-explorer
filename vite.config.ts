import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base must match the GitHub Pages path or every asset 404s in production.
export default defineConfig({
  base: '/pcrt-explorer/',
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
})
