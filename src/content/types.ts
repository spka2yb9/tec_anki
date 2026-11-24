// TecAnki のコンテンツ型。語彙専用アプリなので VocabularyEntry だけを持つ。

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2'

export type VocabularyEntry = {
  id: string
  word: string
  level: CefrLevel
  /** 品詞(日本語: 動詞・名詞・形容詞・副詞・句動詞 など) */
  partOfSpeech: string
  meaningsJa: string[]
  /** IPA発音記号 */
  pronunciation: string
  exampleSentence: string
  exampleTranslationJa: string
  /** 外部のオープン対訳を使用する場合の出典。独自例文では省略する。 */
  exampleSource?: {
    name: string
    url: string
    license: string
    attribution?: string
  }
  collocations?: string[]

  // --- 旧データ互換の任意フィールド。TecAnki の画面には表示しない。 ---
  wordFormation?: string
  mnemonic?: string
  relatedWords?: string[]
}
