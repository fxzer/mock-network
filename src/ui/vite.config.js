import react from '@vitejs/plugin-react';

import { visualizer } from 'rollup-plugin-visualizer';
/* global require, __dirname */
import { defineConfig } from 'vite';
const path = require('path');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), visualizer({
    emitFile: false,
    file: 'stats.html',
  })],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@components': path.resolve(__dirname, './components'),
      '@hooks': path.resolve(__dirname, './hooks'),
      '@utils': path.resolve(__dirname, './utils'),
      '@constants': path.resolve(__dirname, './constants'),
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
        chunkFileNames: 'static/js/[name]-[hash].js',
        entryFileNames: 'static/js/[name]-[hash].js',
        assetFileNames: 'static/css/[name]-[hash].[ext]',
      },
    },
  },
})
