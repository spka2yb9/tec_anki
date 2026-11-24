// ts-fsrs(FSRS-6)の薄いラッパー。
//
// Anki と同系統のスケジューリングにするため、以下を固定する:
//   - 学習ステップ 1分 → 10分、再学習 10分
//   - 目標保持率 90%、最大間隔 36500日、fuzz 有効
// これらは学習者に変更させない(設定で変えられるのは1日の枚数だけ)。
//
// カードは日付を ISO 文字列にして localStorage に保存する。読み込み時に Date へ戻す。

import { DefaultScheduler, Rating, State, type Grade } from 'ts-fsrs'

export { Rating, State }
export type ReviewGrade = Grade

type Scheduler = Awaited<ReturnType<typeof DefaultScheduler>>

/** ts-fsrs のバージョン差(stabilityFast の有無など)を吸収する構造的カード型。 */
type SerializableCard = {
  cardId: string | number
  dueAt: Date
  lastReviewAt?: Date | null
  state: number
  scheduleStatus?: string
  stability: number
  stabilityFast?: number
  difficulty: number
  reps: number
  lapses: number
  scheduledDays: number
  learningStep?: number
}

/** 実装した FSRS のバージョン。 */
const VERSION = 'FSRS-6'

let schedulerPromise: Promise<Scheduler> | undefined

function getScheduler(): Promise<Scheduler> {
  return (schedulerPromise ??= DefaultScheduler({
    version: VERSION,
    desiredRetention: 0.9,
    enableShortTerm: true,
    learningSteps: ['1m', '10m'],
    relearningSteps: ['10m'],
    maximumInterval: 36_500,
    enableFuzz: true,
  }))
}

/** localStorage に保存する形。Date は ISO 文字列。 */
export type StoredCard = {
  cardId: string
  dueAt: string
  lastReviewAt: string | null
  state: number
  scheduleStatus?: string
  stability: number
  difficulty: number
  reps: number
  lapses: number
  scheduledDays: number
  learningStep: number
}

export type CardMap = Record<string, StoredCard>

function serialize(card: SerializableCard): StoredCard {
  return {
    cardId: String(card.cardId),
    dueAt: new Date(card.dueAt).toISOString(),
    lastReviewAt: card.lastReviewAt ? new Date(card.lastReviewAt).toISOString() : null,
    state: card.state,
    scheduleStatus: (card as { scheduleStatus?: string }).scheduleStatus,
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.scheduledDays,
    learningStep: (card as { learningStep?: number }).learningStep ?? 0,
  }
}

function deserialize(stored: StoredCard): SerializableCard {
  return {
    ...stored,
    dueAt: new Date(stored.dueAt),
    lastReviewAt: stored.lastReviewAt ? new Date(stored.lastReviewAt) : null,
  }
}

/** 新規カードを作る(まだ学習していない語)。 */
export async function newCard(id: string, now: Date = new Date()): Promise<StoredCard> {
  const scheduler = await getScheduler()
  return serialize(scheduler.newCard({ now, cardId: id } as never))
}

export type GradePreview = {
  grade: ReviewGrade
  dueAt: Date
  /** 「10分」「3日」のような表示用ラベル */
  label: string
}

/**
 * 4段階それぞれの次回予定。回答後のボタンに「次回 3日後」と出すために使う。
 */
export async function previewGrades(
  card: StoredCard,
  now: Date = new Date(),
): Promise<Record<ReviewGrade, GradePreview>> {
  const scheduler = await getScheduler()
  const out = {} as Record<ReviewGrade, GradePreview>
  for (const item of scheduler.preview({ card: deserialize(card) as never, now })) {
    const grade = item.grade as ReviewGrade
    const dueAt = new Date(item.card.dueAt)
    out[grade] = { grade, dueAt, label: formatInterval(now, dueAt) }
  }
  return out
}

/** 回答を反映した新しいカードを返す。 */
export async function reviewCard(card: StoredCard, grade: ReviewGrade, now: Date = new Date()): Promise<StoredCard> {
  const scheduler = await getScheduler()
  return serialize(scheduler.review({ card: deserialize(card) as never, grade, now }).card)
}

export function isNew(card: StoredCard): boolean {
  return card.state === State.New
}

/** 学習ステップ中(Learning / Relearning)か。 */
export function isLearningState(card: StoredCard): boolean {
  return card.state === State.Learning || card.state === State.Relearning
}

/** 復習対象になっているか(新規以外で期日到来)。 */
export function isDue(card: StoredCard, now: number): boolean {
  return card.state !== State.New && new Date(card.dueAt).getTime() <= now
}

/**
 * 学習ステップ中のカードを同じセッションに戻すか。
 * 10分・1分のような短い待ちだけを対象にし、日単位の復習カードはセッションから外す。
 */
export function requeueAfterMs(card: StoredCard, now: number): number | null {
  if (!isLearningState(card)) return null
  const due = new Date(card.dueAt).getTime()
  const delta = due - now
  if (delta <= 0) return 0
  return delta < 86_400_000 ? delta : null
}

/** 次回までの長さを日本語で表す。 */
export function formatInterval(from: Date, due: Date): string {
  const ms = due.getTime() - from.getTime()
  if (ms <= 0) return '今すぐ'
  const minutes = ms / 60_000
  if (minutes < 1) return '1分未満'
  if (minutes < 60) return `${Math.round(minutes)}分`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}時間`
  const days = minutes / (60 * 24)
  if (days < 30) return `${Math.round(days)}日`
  if (days < 365) return `${(days / 30).toFixed(1).replace(/\.0$/, '')}か月`
  return `${(days / 365).toFixed(1).replace(/\.0$/, '')}年`
}
