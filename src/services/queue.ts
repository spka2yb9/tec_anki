// 今日の学習キューを作る。
//
// - 復習: 期日が来ているカード(新規以外)。期日の早い順。
// - 新規: まだカードが無い語。レベル昇順で導入する(A1 → A2 → B1 → B2)。
//   同レベル内は「短い語 → アルファベット順」で、易しい語から並べる(頻度リストの代替)。
// - 日次上限は「今日すでに導入した新規数」「今日すでに答えた復習数」を差し引いて残りを出す。

import { allVocabulary, levelRank } from '../content/vocabulary'
import type { CardMap } from './srs'
import { isDue } from './srs'
import type { DailyStat } from './daily'
import type { Settings } from './settings'

/** 新規導入の並び。レベル → 語の短さ → アルファベット。 */
const NEW_ORDER: readonly string[] = [...allVocabulary]
  .sort((a, b) => {
    const byLevel = levelRank(a.level) - levelRank(b.level)
    if (byLevel !== 0) return byLevel
    const byLength = a.word.length - b.word.length
    if (byLength !== 0) return byLength
    return a.word.localeCompare(b.word)
  })
  .map((entry) => entry.id)

const WORD_INDEX = new Map(allVocabulary.map((entry, index) => [entry.id, index]))

/** 期日が来ている復習カード。期日が早い順。 */
export function dueReviewIds(cards: CardMap, now: number = Date.now()): string[] {
  return Object.entries(cards)
    .filter(([, card]) => isDue(card, now))
    .sort((a, b) => new Date(a[1].dueAt).getTime() - new Date(b[1].dueAt).getTime())
    .map(([id]) => id)
}

/** まだカードが無い語を、導入順に並べて返す。 */
export function unseenWordIds(cards: CardMap): string[] {
  return NEW_ORDER.filter((id) => cards[id] === undefined)
}

export type TodayPlan = {
  /** 今日の復習(上限で切った後) */
  reviewIds: string[]
  /** 今日の新規(上限で切った後) */
  newIds: string[]
  /** 上限に関係なく、いま期日が来ている復習の総数 */
  dueTotal: number
  /** 上限に関係なく、残っている未学習語の総数 */
  unseenTotal: number
  /** 今日すでに答えた復習数 */
  reviewsDone: number
  /** 今日すでに導入した新規数 */
  newDone: number
}

export function buildTodayPlan(
  cards: CardMap,
  settings: Settings,
  daily: DailyStat,
): TodayPlan {
  const due = dueReviewIds(cards)
  const unseen = unseenWordIds(cards)
  const reviewSlots = Math.max(0, settings.reviewsPerDay - daily.reviews)
  const newSlots = Math.max(0, settings.newPerDay - daily.newCards)
  return {
    reviewIds: due.slice(0, reviewSlots),
    newIds: unseen.slice(0, newSlots),
    dueTotal: due.length,
    unseenTotal: unseen.length,
    reviewsDone: daily.reviews,
    newDone: daily.newCards,
  }
}

/** 単語一覧の並び(レベル → アルファベット)。 */
export function listOrderIds(): string[] {
  return [...allVocabulary]
    .sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.word.localeCompare(b.word))
    .map((entry) => entry.id)
}

export function orderOf(id: string): number {
  return WORD_INDEX.get(id) ?? Number.MAX_SAFE_INTEGER
}
