import { describe, expect, it } from 'vitest'
import { allVocabulary, LEVELS } from './vocabulary'
import { newVocabularyData } from './vocabulary/new/data.ts'
import { vocabularyIllustrations } from './vocabulary/illustrations'

function stemOf(word: string): string {
  const first = word.split(' ')[0]
  return first.slice(0, Math.max(3, first.length - 3)).toLowerCase()
}

describe('語彙データ', () => {
  it('合計12,000件', () => {
    expect(allVocabulary).toHaveLength(12_000)
  })

  it('見出し語とIDが一意', () => {
    expect(new Set(allVocabulary.map((e) => e.word.toLowerCase())).size).toBe(allVocabulary.length)
    expect(new Set(allVocabulary.map((e) => e.id)).size).toBe(allVocabulary.length)
  })

  it('必須項目が揃っている', () => {
    for (const entry of allVocabulary) {
      expect(LEVELS).toContain(entry.level)
      expect(entry.partOfSpeech.length).toBeGreaterThan(0)
      expect(entry.meaningsJa.length).toBeGreaterThan(0)
      expect(entry.exampleSentence.length).toBeGreaterThan(0)
      expect(entry.exampleTranslationJa.length).toBeGreaterThan(0)
    }
  })

  it('A1〜B2のすべてのレベルに語がある', () => {
    const levels = new Set(allVocabulary.map((e) => e.level))
    for (const level of LEVELS) expect(levels).toContain(level)
  })

  it('新規データを3,000件以上追加している', () => {
    expect(newVocabularyData.length).toBeGreaterThanOrEqual(3_000)
  })

  it('新規の単語は発音・コロケーション・語幹を含む例文を持つ', () => {
    for (const entry of newVocabularyData) {
      if (entry.word.includes(' ')) continue
      const stem = stemOf(entry.word)
      expect(entry.pronunciation, entry.word).toMatch(/^\/.+\/$/)
      expect(entry.collocations?.length ?? 0, entry.word).toBeGreaterThan(0)
      expect(entry.exampleSentence.toLowerCase(), entry.word).toContain(stem)
      expect(entry.collocations!.some((c) => c.toLowerCase().includes(stem)), entry.word).toBe(true)
    }
  })

  it('新規すべてにイラストがある', () => {
    for (const entry of newVocabularyData) {
      expect(vocabularyIllustrations[entry.id], entry.word).toBeDefined()
    }
  })

  it('新規の表現は意味・例文・和訳を持つ', () => {
    for (const entry of newVocabularyData) {
      if (!entry.word.includes(' ')) continue
      expect(entry.meaningsJa.length, entry.word).toBeGreaterThan(0)
      expect(entry.exampleSentence.length, entry.word).toBeGreaterThan(0)
      expect(entry.exampleTranslationJa.length, entry.word).toBeGreaterThan(0)
    }
  })
})
