import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// jsdom 環境では Node の実験的 localStorage が global を上書きし、
// window.localStorage が undefined になることがある。テスト用にメモリ実装を入れる。
function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, String(value))
    },
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  let existing: Storage | undefined
  try {
    existing = window[name]
  } catch {
    existing = undefined
  }
  if (existing) continue
  const storage = memoryStorage()
  try {
    Object.defineProperty(window, name, { value: storage, configurable: true })
  } catch {
    // 定義できなければそのまま(アプリ側は try/catch で継続する)
  }
  try {
    Object.defineProperty(globalThis, name, { value: storage, configurable: true })
  } catch {
    // 同上
  }
}
