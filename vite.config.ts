import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    // Синхронно с paths в tsconfig.app.json
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // GitHub Pages отдаёт сайт из подпапки /random_graph/; в dev остаёмся на корне
  base: command === 'build' ? '/random_graph/' : '/',
}))
