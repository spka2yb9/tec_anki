// 語彙データセットの集約。
//
// - 既存8,800語(baseVocabulary)を読み込む。
// - 「A1相当の内容語」を集約時に A1 へ再分類する。basicWords に載っている A2 の
//   名詞・動詞・形容詞・副詞だけを対象にし、冠詞・代名詞・前置詞などの機能語は動かさない。
// - TecAnki で追加した新規語・表現(newVocabulary)を足して、合計12,000件にする。
// - 記憶のコツ(mnemonic)は表示しないため読み込まない。コロケーションだけ後付け分を補完する。

import type { CefrLevel, VocabularyEntry } from '../types'
import { baseVocabulary } from './base.ts'
import { vocabularyCollocations } from './collocations.ts'
import { newVocabulary } from './new/index.ts'
import { basicWords } from '../basicWords.ts'

const FUNCTION_POS = new Set(['冠詞', '代名詞', '前置詞', '接続詞', '限定詞', '数詞', '間投詞', '助動詞'])

/** 「名詞・動詞」のような複合品詞のうち、内容語の品詞を1つでも含むか。 */
function isContentPos(pos: string): boolean {
  return pos.split('・').some((part) => !FUNCTION_POS.has(part))
}

/** A2 の内容語で、A1基本語リストに載っているものを A1 へ移す。 */
function isA1(word: string, level: CefrLevel, pos: string): boolean {
  return level === 'A2' && isContentPos(pos) && basicWords.has(word.toLowerCase())
}

/** 見出し語の重複を落とす。英米差も同じ語として扱い、先に現れた既存語を優先する。 */
function dedupe(entries: readonly VocabularyEntry[]): VocabularyEntry[] {
  const seen = new Set<string>()
  const out: VocabularyEntry[] = []
  for (const entry of entries) {
    const key = entry.word.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(entry)
  }
  return out
}

const merged = dedupe([...baseVocabulary, ...newVocabulary]).map((entry) => {
  const next: VocabularyEntry = isA1(entry.word, entry.level, entry.partOfSpeech)
    ? { ...entry, level: 'A1' }
    : entry
  if (next.collocations?.length) return next
  const extra = vocabularyCollocations[next.id]
  return extra ? { ...next, collocations: extra } : next
})

export const allVocabulary: VocabularyEntry[] = merged

const vocabMap = new Map(allVocabulary.map((entry) => [entry.id, entry]))

export function findWord(id: string): VocabularyEntry | undefined {
  return vocabMap.get(id)
}

export const LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2']

export function levelRank(level: CefrLevel): number {
  return LEVELS.indexOf(level)
}

/** レベルごとの収録語数。 */
export function vocabCountByLevel(): Record<CefrLevel, number> {
  const counts: Record<CefrLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0 }
  for (const entry of allVocabulary) counts[entry.level] += 1
  return counts
}
