// 日次上限の設定。FSRS のアルゴリズム値は固定で、ここだけ学習者が変更できる。

import { KEYS, loadJson, saveJson } from './storage'

export type Settings = {
  /** 1日に新しく導入する語数 */
  newPerDay: number
  /** 1日に復習する語数 */
  reviewsPerDay: number
}

export const DEFAULT_SETTINGS: Settings = { newPerDay: 20, reviewsPerDay: 200 }

const LIMIT_MIN = 0
const LIMIT_MAX = 999

function clamp(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, Math.round(value)))
}

export function getSettings(): Settings {
  const raw = loadJson<Partial<Settings>>(KEYS.settings, {})
  return {
    newPerDay: clamp(Number(raw.newPerDay), DEFAULT_SETTINGS.newPerDay),
    reviewsPerDay: clamp(Number(raw.reviewsPerDay), DEFAULT_SETTINGS.reviewsPerDay),
  }
}

export function saveSettings(next: Settings): Settings {
  const clean: Settings = {
    newPerDay: clamp(next.newPerDay, DEFAULT_SETTINGS.newPerDay),
    reviewsPerDay: clamp(next.reviewsPerDay, DEFAULT_SETTINGS.reviewsPerDay),
  }
  saveJson(KEYS.settings, clean)
  return clean
}
