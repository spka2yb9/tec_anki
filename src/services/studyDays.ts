// 学習した日の記録。ストリーク(連続日数)と合計日数を出す。
// 1日1件の YYYY-MM-DD 配列。休んだ日で減るものは無い。

import { daysBetween, shiftDate, todayString } from './dates'
import { KEYS, loadJson, saveJson } from './storage'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function getStudyDays(): string[] {
  const raw = loadJson<unknown>(KEYS.studyDays, [])
  if (!Array.isArray(raw)) return []
  const set = new Set<string>()
  for (const value of raw) if (typeof value === 'string' && DATE_PATTERN.test(value)) set.add(value)
  return [...set].sort()
}

export function recordStudyDay(today: string = todayString()): void {
  const days = getStudyDays()
  if (days.includes(today)) return
  saveJson(KEYS.studyDays, [...days, today].sort())
}

export function totalStudyDays(): number {
  return getStudyDays().length
}

/** 今日(今日が未学習なら昨日)から遡って連続している日数。 */
export function currentStreak(today: string = todayString(), days: readonly string[] = getStudyDays()): number {
  const set = new Set(days)
  let cursor = set.has(today) ? today : shiftDate(today, -1)
  if (!set.has(cursor)) return 0
  let streak = 0
  while (set.has(cursor)) {
    streak += 1
    cursor = shiftDate(cursor, -1)
  }
  return streak
}

export function longestStreak(days: readonly string[] = getStudyDays()): number {
  let best = 0
  let run = 0
  for (let i = 0; i < days.length; i += 1) {
    run = i > 0 && daysBetween(days[i - 1], days[i]) === 1 ? run + 1 : 1
    if (run > best) best = run
  }
  return best
}

