/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Actions では GITHUB_REPOSITORY に `owner/repo` が入る。
// プロジェクトページは https://owner.github.io/repo/ 配下に出るため base をそこに合わせる。
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repo !== undefined && !repo.endsWith('.github.io') ? `/${repo}/` : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'TecAnki — 英単語',
        short_name: 'TecAnki',
        description: 'FSRSで間隔反復する英単語学習アプリ。イメージと例文で覚える。',
        lang: 'ja',
        theme_color: '#173f5f',
        background_color: '#f6f8f7',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 語彙データ・イラスト(SVG)・IPAフォントまで含めて完全オフライン化する。
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    // 語彙データ(約1万語)と全イラストをPWAで先読みするため、警告上限を上げる。
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30_000,
  },
})
