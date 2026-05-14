import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')

const name = process.env.INJECT_FILE || 'index'
if (name !== 'index' && name !== 'mock') {
  throw new Error(`INJECT_FILE must be index or mock, got: ${name}`)
}

const emptyFirst = process.env.INJECT_EMPTY_OUT_DIR !== '0'

/** 扩展 content script：每次单入口，避免 Rolldown 多入口 + iife 与 codeSplitting 冲突 */
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    root: repoRoot,
    publicDir: false,
    build: {
      emptyOutDir: emptyFirst,
      outDir: '.cache/inject-dist',
      sourcemap: false,
      minify: isProd ? 'oxc' : false,
      target: 'es2016',
      rolldownOptions: {
        input: {
          [name]: `src/inject/${name}.js`,
        },
        output: {
          entryFileNames: '[name].js',
          format: 'iife',
          /** 消除 MISSING_NAME_OPTION_FOR_IIFE_EXPORT；与页面脚本内其它全局隔离 */
          name: name === 'index' ? '__MN_INJECT_INDEX__' : '__MN_INJECT_MOCK__',
          codeSplitting: false,
        },
      },
    },
  }
})
