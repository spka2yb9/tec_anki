import { describe, expect, it } from 'vitest'
import { formatInterval, newCard, previewGrades, reviewCard, Rating, State } from './srs'

const T0 = new Date('2026-01-01T00:00:00.000Z')

describe('srs wrapper', () => {
  it('creates a new card with the word id', async () => {
    const card = await newCard('apple', T0)
    expect(card.cardId).toBe('apple')
    expect(card.state).toBe(State.New)
    expect(card.dueAt).toBe(T0.toISOString())
  })

  it('previews the four grades with learning steps', async () => {
    const card = await newCard('apple', T0)
    const preview = await previewGrades(card, T0)
    expect(preview[Rating.Again].label).toBe('1分')
    expect(preview[Rating.Hard].label).toBe('6分')
    expect(preview[Rating.Good].label).toBe('10分')
    expect(preview[Rating.Easy].label).toMatch(/日|か月/)
  })

  it('Good on a new card enters the 10-minute learning step', async () => {
    const card = await newCard('apple', T0)
    const next = await reviewCard(card, Rating.Good, T0)
    expect(next.state).toBe(State.Learning)
    expect(new Date(next.dueAt).getTime() - T0.getTime()).toBe(10 * 60_000)
  })

  it('a second Good graduates the card into review', async () => {
    const card = await newCard('apple', T0)
    const first = await reviewCard(card, Rating.Good, T0)
    const at = new Date(first.dueAt)
    const second = await reviewCard(first, Rating.Good, at)
    expect(second.state).toBe(State.Review)
    expect(second.scheduledDays).toBeGreaterThanOrEqual(1)
  })

  it('Again goes back to a 1-minute step', async () => {
    const card = await newCard('apple', T0)
    const next = await reviewCard(card, Rating.Again, T0)
    expect(next.state).toBe(State.Learning)
    expect(new Date(next.dueAt).getTime() - T0.getTime()).toBe(60_000)
  })

  it('formats intervals for display', () => {
    expect(formatInterval(T0, new Date(T0.getTime() + 60_000))).toBe('1分')
    expect(formatInterval(T0, new Date(T0.getTime() + 3 * 86_400_000))).toBe('3日')
    expect(formatInterval(T0, new Date(T0.getTime() + 60 * 86_400_000))).toBe('2か月')
  })
})
