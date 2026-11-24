// 日ごとの学習量。今日すでに導入した新規数・復習数を数え、日次上限の残りを出す。

import { dateString, shiftDate } from './dates'
import { KEYS, loadJson, saveJson } from './storage'
import type { Rating } from './srs'
import { Rating as R } from './srs'

export type DailyStat = {
  /** その日に新しく導入した語数 */
  newCards: number
  /** その日に回答した復習(新規以外)の回数 */
  reviews: number
  again: number
  hard: number
  good: number
  easy: number
}

export type DailyMap = Record<string, DailyStat>

export const EMPTY_DAY: DailyStat = { newCards: 0, reviews: 0, again: 0, hard: 0, good: 0, easy: 0 }

const KEEP_DAYS = 400

export function getDaily(): DailyMap {
  const raw = loadJson<DailyMap>(KEYS.daily, {})
  return raw && typeof raw === 'object' ? raw : {}
}

export function statFor(map: DailyMap, date: string): DailyStat {
  return { ...EMPTY_DAY, ...(map[date] ?? {}) }
}

export function todayStat(now: Date = new Date()): DailyStat {
  return statFor(getDaily(), dateString(now))
}

/** 1回の回答を記録する。新規カードの初回だけ newCards を増やす。 */
export function recordReview(grade: Rating, wasNew: boolean, now: Date = new Date()): DailyStat {
  const map = getDaily()
  const date = dateString(now)
  const prev = statFor(map, date)
  const next: DailyStat = {
    newCards: prev.newCards + (wasNew ? 1 : 0),
    reviews: prev.reviews + (wasNew ? 0 : 1),
    again: prev.again + (grade === R.Again ? 1 : 0),
    hard: prev.hard + (grade === R.Hard ? 1 : 0),
    good: prev.good + (grade === R.Good ? 1 : 0),
    easy: prev.easy + (grade === R.Easy ? 1 : 0),
  }
  map[date] = next
  saveJson(KEYS.daily, prune(map, date))
  return next
}

/** 古い日を落として保存サイズを抑える。 */
function prune(map: DailyMap, today: string): DailyMap {
  const oldest = shiftDate(today, -KEEP_DAYS)
  const out: DailyMap = {}
  for (const [date, stat] of Object.entries(map)) if (date >= oldest) out[date] = stat
  return out
}
