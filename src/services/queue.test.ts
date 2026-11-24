import { describe, expect, it } from 'vitest'
import { findWord } from '../content/vocabulary'
import { State, type StoredCard } from './srs'
import { buildTodayPlan, dueReviewIds, unseenWordIds } from './queue'
import type { DailyStat } from './daily'

const NOW = Date.parse('2026-01-01T00:00:00Z')

function card(id: string, state: number, dueAt: number): StoredCard {
  return {
    cardId: id,
    dueAt: new Date(dueAt).toISOString(),
    lastReviewAt: null,
    state,
    stability: 1,
    difficulty: 1,
    reps: 1,
    lapses: 0,
    scheduledDays: 1,
    learningStep: 0,
  }
}

const noDaily: DailyStat = { newCards: 0, reviews: 0, again: 0, hard: 0, good: 0, easy: 0 }

describe('today queue', () => {
  it('orders due reviews by due date and excludes future cards', () => {
    const cards = {
      a: card('a', State.Review, NOW - 1000),
      b: card('b', State.Review, NOW - 5000),
      c: card('c', State.Review, NOW + 1000),
    }
    expect(dueReviewIds(cards, NOW)).toEqual(['b', 'a'])
  })

  it('introduces unseen words from A1 first', () => {
    const ids = unseenWordIds({})
    expect(ids.length).toBeGreaterThan(1000)
    expect(findWord(ids[0])?.level).toBe('A1')
  })

  it('skips words that already have a card', () => {
    const ids = unseenWordIds({})
    const first = ids[0]
    const rest = unseenWordIds({ [first]: card(first, State.Learning, NOW) })
    expect(rest).not.toContain(first)
  })

  it('applies daily limits to reviews and new cards', () => {
    const cards: Record<string, StoredCard> = {}
    for (let i = 0; i < 10; i += 1) cards[`due${i}`] = card(`due${i}`, State.Review, NOW - i * 1000)
    const plan = buildTodayPlan(cards, { newPerDay: 3, reviewsPerDay: 4 }, noDaily)
    expect(plan.reviewIds).toHaveLength(4)
    expect(plan.newIds).toHaveLength(3)
    expect(plan.dueTotal).toBe(10)
  })

  it('subtracts what was already done today', () => {
    const plan = buildTodayPlan({}, { newPerDay: 5, reviewsPerDay: 5 }, { ...noDaily, newCards: 2, reviews: 3 })
    expect(plan.newIds).toHaveLength(3)
    expect(plan.reviewIds).toHaveLength(0)
  })
})
