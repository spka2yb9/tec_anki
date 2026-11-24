// 1日セッションの状態機械(純粋関数)。
//
// - 復習 → 新規の順でキューに積む。
// - 学習ステップ(1分/10分)のカードは、他のカードを先に出し、期日が来たら戻す。
// - 他に出せるカードが無く学習カードの期日が先なら、待機時刻(waitUntil)を返す。
//   「今すぐ続ける」で待たずに取り出せる。

export type LearningEntry = { id: string; dueAt: number }

export type SessionState = {
  queue: string[]
  learning: LearningEntry[]
  current: string | null
  /** 回答した回数(学習ステップの再出題も含む) */
  answered: number
  /** セッション開始時の枚数 */
  total: number
  /** 待機再開時刻。null なら待機していない。 */
  waitUntil: number | null
  finished: boolean
}

export function startSession(ids: readonly string[]): SessionState {
  if (ids.length === 0) {
    return { queue: [], learning: [], current: null, answered: 0, total: 0, waitUntil: null, finished: true }
  }
  const [first, ...rest] = ids
  return { queue: rest, learning: [], current: first, answered: 0, total: ids.length, waitUntil: null, finished: false }
}

/** 残りのカード数(現在表示中 + キュー + 学習待ち)。 */
export function remainingCount(state: SessionState): number {
  return state.queue.length + state.learning.length + (state.current ? 1 : 0)
}

/**
 * 現在のカードに回答した結果を反映する。
 * requeueAt は学習ステップで同じセッションに出し直す時刻(ms)。復習カードなら null。
 */
export function completeCard(state: SessionState, requeueAt: number | null, now: number = Date.now()): SessionState {
  if (state.current === null) return state
  const learning = requeueAt === null
    ? state.learning
    : [...state.learning, { id: state.current, dueAt: requeueAt }]
  return advance(
    { ...state, learning, current: null, answered: state.answered + 1 },
    now,
  )
}

function advance(state: SessionState, now: number): SessionState {
  if (state.queue.length > 0) {
    const [next, ...rest] = state.queue
    return { ...state, queue: rest, current: next, waitUntil: null }
  }

  const due = state.learning
    .filter((entry) => entry.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
  if (due.length > 0) {
    const [first, ...rest] = due
    return { ...state, learning: rest, current: first.id, waitUntil: null }
  }

  if (state.learning.length > 0) {
    const earliest = Math.min(...state.learning.map((entry) => entry.dueAt))
    return { ...state, current: null, waitUntil: earliest }
  }

  return { ...state, current: null, waitUntil: null, finished: true }
}

/** 「今すぐ続ける」。学習待ちの中で最も早いカードを待たずに出す。 */
export function continueNow(state: SessionState): SessionState {
  if (state.learning.length === 0) return state
  const sorted = [...state.learning].sort((a, b) => a.dueAt - b.dueAt)
  const [first, ...rest] = sorted
  return { ...state, learning: rest, current: first.id, waitUntil: null }
}
