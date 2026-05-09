/* global __dirname */
import path from 'node:path'

import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      emitFile: false,
      file: 'stats.html',
    }),
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@components': path.resolve(__dirname, './components'),
      '@constants': path.resolve(__dirname, './constants'),
      '@hooks': path.resolve(__dirname, './hooks'),
      '@utils': path.resolve(__dirname, './utils'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, './index.html'),
        network: path.resolve(__dirname, './network.html'),
        rules: path.resolve(__dirname, './rules.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('monaco-editor')) {
            return 'monaco'
          }
        },
        assetFileNames: 'static/css/[name]-[hash].[ext]',
        chunkFileNames: 'static/js/[name]-[hash].js',
        entryFileNames: 'static/js/[name]-[hash].js',
      },
    },
  },
})
