/* global __dirname */
import path from 'node:path'
import process from 'node:process'

import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

const repoRoot = path.resolve(__dirname, '../..')

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    plugins: [
      react(),
      ...(process.env.ANALYZE === '1'
        ? [
            visualizer({
              emitFile: false,
              file: 'stats.html',
            }),
          ]
        : []),
    ],
    base: './',
    server: {
      fs: {
        allow: [path.resolve(__dirname), repoRoot],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        '@components': path.resolve(__dirname, './components'),
        '@constants': path.resolve(__dirname, './constants'),
        '@hooks': path.resolve(__dirname, './hooks'),
        '@utils': path.resolve(__dirname, './utils'),
        '@shared': path.resolve(repoRoot, 'src/shared'),
      },
    },
    build: {
      // 开发构建便于调试；生产默认不生成 sourcemap（与 Vite 8 默认一致，此处显式保留开发图）
      sourcemap: mode === 'development',
      // Vite 8 默认使用 Oxc 压缩 JS，无需 esbuild（见 https://vite.dev/config/build-options.html#build-minify ）
      minify: mode === 'production' ? 'oxc' : false,
      target: 'es2016',
      rolldownOptions: {
        input: {
          index: path.resolve(__dirname, './index.html'),
          network: path.resolve(__dirname, './network.html'),
          rules: path.resolve(__dirname, './rules.html'),
        },
        output: {
          // 覆盖 Vite 内置的 output.minify: true，使用 Oxc CompressOptions（Rolldown 类型）
          ...(isProd
            ? {
                minify: {
                  compress: {
                    dropConsole: true,
                    dropDebugger: true,
                  },
                  mangle: true,
                },
              }
            : {}),
          manualChunks(id) {
            if (id.includes('monaco-editor')) {
              return 'monaco'
            }
            if (id.includes('node_modules/@ant-design/icons/')) {
              return 'antd-icons'
            }
            if (
              id.includes('node_modules/@rc-component/')
              || id.includes('node_modules/rc-')
            ) {
              return 'antd-rc'
            }
            if (id.includes('node_modules/antd/')) {
              return 'antd'
            }
            if (
              id.includes('node_modules/react/')
              || id.includes('node_modules/react-dom/')
              || id.includes('node_modules/scheduler/')
            ) {
              return 'react-vendor'
            }
          },
          assetFileNames: 'static/css/[name]-[hash].[ext]',
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
        },
      },
    },
  }
})
