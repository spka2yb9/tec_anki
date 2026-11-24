// イラスト対応表。既存8,800語(baseIllustrations)と、新規語彙(new/illustrations)を合成する。

import { baseVocabularyIllustrations, type VocabularyIllustration } from './baseIllustrations.ts'
import { newVocabularyIllustrations } from './new/illustrations.ts'

export type { VocabularyIllustration }

export const vocabularyIllustrations: Readonly<Record<string, VocabularyIllustration>> = {
  ...baseVocabularyIllustrations,
  ...newVocabularyIllustrations,
}
