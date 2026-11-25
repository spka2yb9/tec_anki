// 1日の上限。設定UIは無く、アプリ側で固定。FSRS のアルゴリズム値も固定。

export type Settings = {
  /** 1日に新しく導入する語数 */
  newPerDay: number
  /** 1日に復習する語数 */
  reviewsPerDay: number
}

export const DEFAULT_SETTINGS: Settings = { newPerDay: 15, reviewsPerDay: 200 }

export function getSettings(): Settings {
  return DEFAULT_SETTINGS
}
