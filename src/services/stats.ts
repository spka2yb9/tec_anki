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
export function forecast(cards: CardMap, days = 7, today = todayString()): ForecastDay[] {
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

export function dailySeries(daily: DailyMap, days = 14, today = todayString()): DayActivity[] {
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

/** 復習カードの成熟度。Anki に合わせ、間隔21日以上を「成熟」とみなす。 */
export const MATURE_DAYS = 21

export type MaturityBuckets = {
  /** 成熟(復習間隔21日以上) */
  mature: number
  /** 育成(復習カードだが間隔21日未満) */
  young: number
  /** 学習ステップ中(Learning / Relearning) */
  learning: number
  /** 未学習(カードが無い、または新規) */
  fresh: number
  total: number
}

export function maturityBuckets(cards: CardMap): MaturityBuckets {
  const out: MaturityBuckets = { mature: 0, young: 0, learning: 0, fresh: 0, total: 0 }
  for (const entry of allVocabulary) {
    out.total += 1
    const card = cards[entry.id]
    if (!card || card.state === State.New) out.fresh += 1
    else if (card.state === State.Learning || card.state === State.Relearning) out.learning += 1
    else if (card.scheduledDays >= MATURE_DAYS) out.mature += 1
    else out.young += 1
  }
  return out
}

export type AnswerSummary = { total: number; correct: number; again: number; accuracyPct: number }

/** 評価の集計から正答率(「もう一度」以外の割合)を出す。 */
export function answerSummary(totals: RatingTotals): AnswerSummary {
  const total = totals.again + totals.hard + totals.good + totals.easy
  const correct = total - totals.again
  return { total, correct, again: totals.again, accuracyPct: total === 0 ? 0 : Math.round((correct / total) * 100) }
}

export type ActivitySummary = {
  /** 期間内で1枚以上学習した日数 */
  activeDays: number
  /** 期間内の合計学習枚数 */
  total: number
  /** 学習した日1日あたりの平均枚数 */
  averagePerActiveDay: number
  /** 最も学習した日(記録が無ければ null) */
  best: DayActivity | null
}

export function activitySummary(daily: DailyMap, days = 30, today = todayString()): ActivitySummary {
  const series = dailySeries(daily, days, today)
  let activeDays = 0
  let total = 0
  let best: DayActivity | null = null
  for (const day of series) {
    total += day.total
    if (day.total > 0) activeDays += 1
    if (!best || day.total > best.total) best = day
  }
  return {
    activeDays,
    total,
    averagePerActiveDay: activeDays === 0 ? 0 : Math.round(total / activeDays),
    best: best && best.total > 0 ? best : null,
  }
}

export type WeekTotals = { thisWeek: number; lastWeek: number; deltaPct: number | null }

/** 直近7日とその前の7日の学習量を比べる。前週が0なら増減率は null。 */
export function weekTotals(daily: DailyMap, today = todayString()): WeekTotals {
  const sum = (offset: number): number => {
    let total = 0
    for (let i = 0; i < 7; i += 1) {
      const stat = daily[shiftDate(today, -(offset + i))]
      if (stat) total += stat.reviews + stat.newCards
    }
    return total
  }
  const thisWeek = sum(0)
  const lastWeek = sum(7)
  return {
    thisWeek,
    lastWeek,
    deltaPct: lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100),
  }
}

/** 期日を過ぎている復習カード(新規を除く)。 */
export function overdueCount(cards: CardMap, today = todayString()): number {
  let count = 0
  for (const card of Object.values(cards)) {
    if (card.state === State.New) continue
    if (dateString(new Date(card.dueAt)) < today) count += 1
  }
  return count
}

export type CalendarCell = { date: string; total: number; level: number }

export type ActivityCalendar = {
  /** 週ごとの列(Sunday 始まり)。学習の無い余白は null。 */
  weeks: (CalendarCell | null)[][]
  max: number
}

const CALENDAR_LEVELS = 4

/** 直近 weekCount 週間の学習量を、日曜始まりのカレンダー用セルにまとめる。 */
export function activityCalendar(daily: DailyMap, weekCount = 12, today = todayString()): ActivityCalendar {
  const days = dailySeries(daily, weekCount * 7, today)
  const max = Math.max(0, ...days.map((day) => day.total))
  const firstWeekday = new Date(`${days[0].date}T00:00:00`).getDay()
  const cells: (CalendarCell | null)[] = Array.from({ length: firstWeekday }, () => null)
  for (const day of days) {
    const level = day.total === 0 || max === 0 ? 0 : Math.max(1, Math.ceil((day.total / max) * CALENDAR_LEVELS))
    cells.push({ date: day.date, total: day.total, level })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (CalendarCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return { weeks, max }
}
