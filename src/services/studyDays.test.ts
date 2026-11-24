import { describe, expect, it } from 'vitest'
import { currentStreak, longestStreak } from './studyDays'

describe('study days', () => {
  const days = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-06']

  it('counts a streak ending today', () => {
    expect(currentStreak('2026-01-03', days)).toBe(3)
  })

  it('keeps the streak alive until the day after the last study day', () => {
    expect(currentStreak('2026-01-04', days)).toBe(3)
  })

  it('breaks after a full missed day', () => {
    expect(currentStreak('2026-01-05', days)).toBe(0)
  })

  it('finds the longest run', () => {
    expect(longestStreak(days)).toBe(3)
  })
})
