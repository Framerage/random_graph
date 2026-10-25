import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/* ===== Границы модульной архитектуры =====
 * app     → может всё, но в модули — только через их index.ts
 * modules → shared и свои файлы; другие модули и app — нельзя
 * shared  → только shared
 * Правило no-restricted-imports не складывается между блоками, а заменяется,
 * поэтому каждый блок собирает полный список запретов.
 */
const deepModuleImport = {
  group: ['@/modules/*/**'],
  message: 'Модуль импортируется только через публичный API: @/modules/<name>.',
}
const appImport = {
  group: ['@/app', '@/app/**'],
  message: 'app собирает приложение — от него никто не зависит.',
}
const otherModuleImport = {
  group: ['@/modules', '@/modules/**'],
  message: 'Модули не знают друг о друге: общее выносится в shared, связывание — в app. Свои файлы — относительным путём.',
}
const restrictImports = (...patterns) => ['error', { patterns }]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/main.tsx'],
    rules: { 'no-restricted-imports': restrictImports(deepModuleImport) },
  },
  {
    files: ['src/modules/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': restrictImports(otherModuleImport, appImport) },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictImports(
        { ...otherModuleImport, message: 'shared не зависит от модулей.' },
        { ...appImport, message: 'shared не зависит от app.' },
      ),
    },
  },
])
