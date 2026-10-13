import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages отдаёт сайт из подпапки /random_graph/; в dev остаёмся на корне
  base: command === 'build' ? '/random_graph/' : '/',
}))
