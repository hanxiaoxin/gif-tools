import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const version = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf-8'),
).version as string

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },

  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'gif-tools.es.js',
    },

    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },

    cssCodeSplit: false,
  },
})
