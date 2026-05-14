import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const injectDir = path.join(repoRoot, 'src/inject')
const outDir = path.join(repoRoot, '.cache/inject-dist')

/** 扩展 content script：不经 UI 入口，仅用 Rolldown + Oxc 分文件输出 */
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    root: repoRoot,
    publicDir: false,
    build: {
      emptyOutDir: true,
      outDir,
      sourcemap: false,
      minify: isProd ? 'oxc' : false,
      target: 'es2016',
      rolldownOptions: {
        input: {
          index: path.join(injectDir, 'index.js'),
          mock: path.join(injectDir, 'mock.js'),
        },
        output: {
          entryFileNames: '[name].js',
          format: 'iife',
          inlineDynamicImports: true,
        },
      },
    },
  }
})
