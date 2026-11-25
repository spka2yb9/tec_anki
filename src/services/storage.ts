// localStorage の型付きラッパー。ストレージ不可・破損データでもアプリは動作する。

import { progressKeys, schedulePush } from './sync'

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    schedulePush() // 同期がオフなら即 return するだけ
  } catch {
    // ストレージ不可(プライベートモード等)でも学習は継続できる
  }
}

/** 進捗キーを消す。同期の設定(トークン・Gist)は残す。 */
export function resetProgress(prefixes: readonly string[]): void {
  try {
    for (const key of progressKeys()) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) localStorage.removeItem(key)
    }
    schedulePush()
  } catch {
    // ストレージ不可なら消すものが無いだけ
  }
}

// GitHub Pages のプロジェクトページは `username.github.io` が同一オリジンなので、
// 元アプリ(eng.*)と衝突しないよう tecanki.* の接頭辞を使う。
export const KEYS = {
  /** Record<wordId, StoredCard>。ts-fsrs のカードをシリアライズして保存する。 */
  cards: 'tecanki.cards.v1',
  /** Record<YYYY-MM-DD, DailyStat>。その日に覚えた枚数・評価の内訳。 */
  daily: 'tecanki.daily.v1',
  /** string[] 学習した日(YYYY-MM-DD)。ストリークと合計日数に使う。 */
  studyDays: 'tecanki.studyDays.v1',
} as const
