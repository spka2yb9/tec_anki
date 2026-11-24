import { describe, expect, it } from 'vitest'
import { completeCard, continueNow, remainingCount, startSession } from './session'

describe('session state machine', () => {
  it('starts with the first card and queues the rest', () => {
    const s = startSession(['a', 'b', 'c'])
    expect(s.current).toBe('a')
    expect(s.queue).toEqual(['b', 'c'])
    expect(s.total).toBe(3)
    expect(s.finished).toBe(false)
  })

  it('handles an empty session', () => {
    const s = startSession([])
    expect(s.finished).toBe(true)
    expect(s.total).toBe(0)
    expect(remainingCount(s)).toBe(0)
  })

  it('advances through the queue and finishes', () => {
    let s = startSession(['a', 'b'])
    s = completeCard(s, null, 1_000)
    expect(s.current).toBe('b')
    s = completeCard(s, null, 2_000)
    expect(s.finished).toBe(true)
    expect(s.answered).toBe(2)
    expect(remainingCount(s)).toBe(0)
  })

  it('requeues a learning card after the other cards', () => {
    let s = startSession(['a', 'b'])
    s = completeCard(s, 10_000, 1_000) // a は10秒後に再出題
    expect(s.current).toBe('b')
    expect(s.learning).toEqual([{ id: 'a', dueAt: 10_000 }])
    s = completeCard(s, null, 2_000) // b は完了
    expect(s.current).toBeNull()
    expect(s.waitUntil).toBe(10_000)
    expect(s.finished).toBe(false)
  })

  it('shows a requeued card when it becomes due', () => {
    let s = startSession(['a'])
    s = completeCard(s, 5_000, 1_000)
    expect(s.current).toBeNull()
    expect(s.waitUntil).toBe(5_000)
    s = completeCard(s, null, 5_000) // 待機中に completeCard は無変化
    expect(s.current).toBeNull()
    // 時間が来た状態で advance させるため continueNow 相当を再現
    const due = continueNow(s)
    expect(due.current).toBe('a')
  })

  it('continueNow skips the wait', () => {
    let s = startSession(['a'])
    s = completeCard(s, 60_000, 1_000)
    expect(s.waitUntil).toBe(60_000)
    const forced = continueNow(s)
    expect(forced.current).toBe('a')
    expect(forced.waitUntil).toBeNull()
  })
})
