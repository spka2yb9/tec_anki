// 進捗の集計。ホーム・統計ページで共有する。

import { allVocabulary, LEVELS } from '../content/vocabulary'
import type { CardMap } from './srs'
import { State } from './srs'
import type { DailyMap } from './daily'
import { dateString, shiftDate, todayString } from './dates'

export type StateCounts = { total: number; unseen: number; learning: number; review: number }

export function countStates(cards: CardMap): StateCounts {
  const counts: StateCounts = { total: allVocabulary.length, unseen: 0, learning: 0, review: 0 }
  for (const entry of allVocabulary) {
    const card = cards[entry.id]
    if (!card || card.state === State.New) counts.unseen += 1
    else if (card.state === State.Learning || card.state === State.Relearning) counts.learning += 1
    else counts.review += 1
  }
  return counts
}

export type LevelRow = { level: string; total: number; started: number; learned: number }

export function levelProgress(cards: CardMap): LevelRow[] {
  const rows = new Map<string, LevelRow>(LEVELS.map((level) => [level, { level, total: 0, started: 0, learned: 0 }]))
  for (const entry of allVocabulary) {
    const row = rows.get(entry.level)
    if (!row) continue
    row.total += 1
    const card = cards[entry.id]
    if (card) {
      row.started += 1
      if (card.state === State.Review) row.learned += 1
    }
  }
  return LEVELS.map((level) => rows.get(level)!)
}

export type ForecastDay = { date: string; count: number }

/** 今日から days 日ぶんの復習予測。延滞分は今日に寄せる。 */
export function forecast(cards: CardMap, days = 7): ForecastDay[] {
  const today = todayString()
  const buckets = new Map<string, number>()
  for (let i = 0; i < days; i += 1) buckets.set(shiftDate(today, i), 0)
  for (const card of Object.values(cards)) {
    if (card.state === State.New) continue
    const due = dateString(new Date(card.dueAt))
    const day = due < today ? today : due
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1)
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }))
}

export type DayActivity = { date: string; reviews: number; newCards: number; total: number }

export function dailySeries(daily: DailyMap, days = 14): DayActivity[] {
  const today = todayString()
  const out: DayActivity[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = shiftDate(today, -i)
    const stat = daily[date]
    const reviews = stat?.reviews ?? 0
    const newCards = stat?.newCards ?? 0
    out.push({ date, reviews, newCards, total: reviews + newCards })
  }
  return out
}

export type RatingTotals = { again: number; hard: number; good: number; easy: number }

export function ratingTotals(daily: DailyMap): RatingTotals {
  const totals: RatingTotals = { again: 0, hard: 0, good: 0, easy: 0 }
  for (const stat of Object.values(daily)) {
    totals.again += stat.again
    totals.hard += stat.hard
    totals.good += stat.good
    totals.easy += stat.easy
  }
  return totals
}
