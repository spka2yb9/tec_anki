import { describe, expect, it } from 'vitest'
import { allVocabulary } from '../content/vocabulary'
import { shiftDate } from './dates'
import type { DailyStat } from './daily'
import { State, type StoredCard } from './srs'
import {
  activityCalendar,
  activitySummary,
  answerSummary,
  maturityBuckets,
  overdueCount,
  weekTotals,
} from './stats'

const TODAY = '2026-01-15'

function card(id: string, state: number, dueAt: string, scheduledDays = 1): StoredCard {
  return {
    cardId: id,
    dueAt: new Date(`${dueAt}T00:00:00`).toISOString(),
    lastReviewAt: null,
    state,
    stability: 1,
    difficulty: 1,
    reps: 1,
    lapses: 0,
    scheduledDays,
    learningStep: 0,
  }
}

function stat(partial: Partial<DailyStat>): DailyStat {
  return { newCards: 0, reviews: 0, again: 0, hard: 0, good: 0, easy: 0, ...partial }
}

describe('maturityBuckets', () => {
  it('splits vocabulary by FSRS state and interval maturity', () => {
    const ids = allVocabulary.slice(0, 4).map((entry) => entry.id)
    const cards: Record<string, StoredCard> = {
      [ids[1]]: card(ids[1], State.Learning, TODAY),
      [ids[2]]: card(ids[2], State.Review, TODAY, 30),
      [ids[3]]: card(ids[3], State.Review, TODAY, 5),
    }
    const buckets = maturityBuckets(cards)
    expect(buckets.total).toBe(allVocabulary.length)
    expect(buckets.mature).toBe(1)
    expect(buckets.young).toBe(1)
    expect(buckets.learning).toBe(1)
    expect(buckets.fresh).toBe(allVocabulary.length - 3)
  })
})

describe('answerSummary', () => {
  it('treats every grade except "again" as correct', () => {
    const summary = answerSummary({ again: 10, hard: 20, good: 50, easy: 20 })
    expect(summary.total).toBe(100)
    expect(summary.correct).toBe(90)
    expect(summary.accuracyPct).toBe(90)
  })

  it('is safe with no answers', () => {
    expect(answerSummary({ again: 0, hard: 0, good: 0, easy: 0 })).toEqual({
      total: 0,
      correct: 0,
      again: 0,
      accuracyPct: 0,
    })
  })
})

describe('weekTotals', () => {
  it('compares the last 7 days against the previous 7', () => {
    const daily = {
      [TODAY]: stat({ reviews: 10 }),
      [shiftDate(TODAY, -7)]: stat({ newCards: 5 }),
    }
    const totals = weekTotals(daily, TODAY)
    expect(totals.thisWeek).toBe(10)
    expect(totals.lastWeek).toBe(5)
    expect(totals.deltaPct).toBe(100)
  })

  it('returns null delta when the previous week is empty', () => {
    expect(weekTotals({ [TODAY]: stat({ reviews: 4 }) }, TODAY)).toEqual({
      thisWeek: 4,
      lastWeek: 0,
      deltaPct: null,
    })
  })
})

describe('activitySummary', () => {
  it('summarises active days, totals, average and best day', () => {
    const daily = {
      [TODAY]: stat({ reviews: 3, newCards: 1 }),
      [shiftDate(TODAY, -1)]: stat({ reviews: 2 }),
    }
    const summary = activitySummary(daily, 14, TODAY)
    expect(summary.activeDays).toBe(2)
    expect(summary.total).toBe(6)
    expect(summary.averagePerActiveDay).toBe(3)
    expect(summary.best?.date).toBe(TODAY)
    expect(summary.best?.total).toBe(4)
  })

  it('has no best day when nothing was studied', () => {
    expect(activitySummary({}, 14, TODAY)).toEqual({
      activeDays: 0,
      total: 0,
      averagePerActiveDay: 0,
      best: null,
    })
  })
})

describe('overdueCount', () => {
  it('counts due reviews that are past today, excluding new cards', () => {
    const cards = {
      past: card('past', State.Review, shiftDate(TODAY, -1)),
      today: card('today', State.Review, TODAY),
      future: card('future', State.Review, shiftDate(TODAY, 1)),
      fresh: card('fresh', State.New, shiftDate(TODAY, -1)),
    }
    expect(overdueCount(cards, TODAY)).toBe(1)
  })
})

describe('activityCalendar', () => {
  it('aligns days into 7-cell weeks and scales levels by the max', () => {
    const daily = {
      [TODAY]: stat({ reviews: 8 }),
      [shiftDate(TODAY, -1)]: stat({ reviews: 2 }),
    }
    const calendar = activityCalendar(daily, 1, TODAY)
    expect(calendar.max).toBe(8)
    expect(calendar.weeks.every((week) => week.length === 7)).toBe(true)
    const cells = calendar.weeks.flat().filter((cell) => cell !== null)
    expect(cells).toHaveLength(7)
    expect(cells.find((cell) => cell.date === TODAY)?.level).toBe(4)
    expect(cells.find((cell) => cell.date === shiftDate(TODAY, -1))?.level).toBe(1)
    expect(cells.find((cell) => cell.date === shiftDate(TODAY, -2))?.level).toBe(0)
  })
})
