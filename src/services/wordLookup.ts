// 例文の単語をタップしたときの意味引き。
//
// 見出し語(12,000件)のうち単語だけを対象に、小文字化した索引を作る。
// 例文中の活用形(複数形・過去形・-ing など)は簡易的に見出し語へ戻して引く。

import type { VocabularyEntry } from '../content/types'
import { allVocabulary } from '../content/vocabulary'

/** 不規則変化のうち、規則変化の候補では引けない頻出形。 */
const IRREGULAR_FORMS: Record<string, string> = {
  am: 'be',
  is: 'be',
  are: 'be',
  was: 'be',
  were: 'be',
  been: 'be',
  being: 'be',
  has: 'have',
  had: 'have',
  having: 'have',
  does: 'do',
  did: 'do',
  done: 'do',
  doing: 'do',
  goes: 'go',
  went: 'go',
  gone: 'go',
  made: 'make',
  took: 'take',
  taken: 'take',
  came: 'come',
  saw: 'see',
  seen: 'see',
  got: 'get',
  gotten: 'get',
  gave: 'give',
  given: 'give',
  knew: 'know',
  known: 'know',
  thought: 'think',
  said: 'say',
  told: 'tell',
  found: 'find',
  felt: 'feel',
  left: 'leave',
  brought: 'bring',
  bought: 'buy',
  caught: 'catch',
  chose: 'choose',
  chosen: 'choose',
  drank: 'drink',
  drunk: 'drink',
  drove: 'drive',
  driven: 'drive',
  ate: 'eat',
  eaten: 'eat',
  fell: 'fall',
  fallen: 'fall',
  flew: 'fly',
  flown: 'fly',
  forgot: 'forget',
  forgotten: 'forget',
  heard: 'hear',
  held: 'hold',
  kept: 'keep',
  led: 'lead',
  lost: 'lose',
  met: 'meet',
  paid: 'pay',
  rode: 'ride',
  ridden: 'ride',
  ran: 'run',
  sold: 'sell',
  sent: 'send',
  sang: 'sing',
  sung: 'sing',
  sat: 'sit',
  slept: 'sleep',
  spoke: 'speak',
  spoken: 'speak',
  spent: 'spend',
  stood: 'stand',
  swam: 'swim',
  swum: 'swim',
  taught: 'teach',
  threw: 'throw',
  thrown: 'throw',
  understood: 'understand',
  wore: 'wear',
  worn: 'wear',
  won: 'win',
  wrote: 'write',
  written: 'write',
  broke: 'break',
  broken: 'break',
  built: 'build',
  began: 'begin',
  begun: 'begin',
  became: 'become',
  could: 'can',
  would: 'will',
  should: 'shall',
  might: 'may',
  children: 'child',
  people: 'person',
  men: 'man',
  women: 'woman',
  feet: 'foot',
  teeth: 'tooth',
  mice: 'mouse',
  lives: 'life',
}

const wordIndex = new Map<string, VocabularyEntry>()
for (const entry of allVocabulary) {
  const key = entry.word.toLowerCase()
  if (!/^[a-z]+(?:['’-][a-z]+)*$/.test(key)) continue
  if (!wordIndex.has(key)) wordIndex.set(key, entry)
}

/** 前後の記号を落として照合用の形にする。 */
function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[’‘]/g, "'").replace(/^[^a-z]+|[^a-z']+$/g, '')
}

/** 熟語(句動詞・慣用句など)の照合キーを作る。 */
function normalizePhrase(phrase: string): string {
  return phrase.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()
}

/** 熟語として1つにまとめる品詞。汎用的なコロケーション(表現)は対象外。 */
const PHRASE_PARTS_OF_SPEECH = new Set(['句動詞', '慣用句', '慣用表現', '接続表現', '連語'])

/** 空白を含む見出し語を、熟語として引けるように索引化する。 */
const phraseIndex = new Map<string, VocabularyEntry>()
let maxPhraseWords = 1
for (const entry of allVocabulary) {
  if (!entry.word.includes(' ')) continue
  if (!PHRASE_PARTS_OF_SPEECH.has(entry.partOfSpeech)) continue
  const key = normalizePhrase(entry.word)
  const parts = key.split(' ')
  if (parts.length < 2) continue
  if (parts.some((part) => !/^[a-z]+(?:['-][a-z]+)*$/.test(part))) continue
  if (!phraseIndex.has(key)) phraseIndex.set(key, entry)
  if (parts.length > maxPhraseWords) maxPhraseWords = parts.length
}

/** 例文中で1つの熟語としてまとめられる最大語数。 */
const MAX_PHRASE_WORDS = maxPhraseWords

function isDoubleConsonant(stem: string): boolean {
  return /([b-df-hj-np-tv-z])\1$/.test(stem)
}

/** 活用形から見出し語の候補を作る(優先順)。 */
function baseCandidates(word: string): string[] {
  const out: string[] = []
  const push = (candidate: string) => {
    if (candidate.length > 1 && candidate !== word && !out.includes(candidate)) out.push(candidate)
  }

  if (word.includes("'")) {
    if (word.endsWith("n't")) {
      push(word.slice(0, -3))
      if (word === "can't") push('can')
      if (word === "won't") push('will')
      if (word === "shan't") push('shall')
    } else if (word.endsWith("'s")) {
      push(word.slice(0, -2))
    } else if (word.endsWith("'")) {
      push(word.slice(0, -1))
    } else {
      push(word.slice(0, word.indexOf("'")))
    }
  }

  if (word.endsWith('ies')) push(word.slice(0, -3) + 'y')
  if (word.endsWith('ves')) {
    push(word.slice(0, -3) + 'f')
    push(word.slice(0, -3) + 'fe')
  }
  if (word.endsWith('es')) push(word.slice(0, -2))
  if (word.endsWith('s')) push(word.slice(0, -1))
  if (word.endsWith('ied')) push(word.slice(0, -3) + 'y')
  if (word.endsWith('ed')) {
    const stem = word.slice(0, -2)
    push(stem)
    push(word.slice(0, -1))
    if (isDoubleConsonant(stem)) push(stem.slice(0, -1))
  }
  if (word.endsWith('ing')) {
    const stem = word.slice(0, -3)
    push(stem)
    push(stem + 'e')
    if (isDoubleConsonant(stem)) push(stem.slice(0, -1))
  }
  if (word.endsWith('ier')) push(word.slice(0, -3) + 'y')
  if (word.endsWith('iest')) push(word.slice(0, -4) + 'y')
  if (word.endsWith('est')) {
    push(word.slice(0, -3))
    push(word.slice(0, -2))
  }
  if (word.endsWith('er')) {
    push(word.slice(0, -2))
    push(word.slice(0, -1))
  }
  if (word.endsWith('ily')) push(word.slice(0, -3) + 'y')
  if (word.endsWith('ly')) {
    const stem = word.slice(0, -2)
    push(stem)
    push(stem + 'e')
  }

  return out
}

/** 例文中の1語から見出し語を引く。見つからなければ undefined。 */
export function lookupWord(token: string): VocabularyEntry | undefined {
  const word = normalizeToken(token)
  if (!word) return undefined

  const direct = wordIndex.get(word)
  if (direct) return direct

  const irregular = IRREGULAR_FORMS[word]
  if (irregular) {
    const entry = wordIndex.get(irregular)
    if (entry) return entry
  }

  for (const candidate of baseCandidates(word)) {
    const entry = wordIndex.get(candidate) ?? wordIndex.get(IRREGULAR_FORMS[candidate])
    if (entry) return entry
  }

  return undefined
}

/** 1語から、辞書照合用の原型候補(元の形も含む)を作る。 */
function lemmaForms(word: string): string[] {
  const out = [word]
  const irregular = IRREGULAR_FORMS[word]
  if (irregular) out.push(irregular)
  for (const candidate of baseCandidates(word)) {
    if (!out.includes(candidate)) out.push(candidate)
  }
  return out
}

export type PhraseMatch = {
  entry: VocabularyEntry
  /** 例文中で一致した語数 */
  length: number
}

/**
 * 例文中の連続する語を熟語に照合し、先頭から最長一致を優先して返す。
 * words は句読点を挾まない、空白区切りの連続した語の配列。
 * 先頭の語(多くは動詞)と末尾の語(多くは名詞)は活用形を原型に戻して照合する。
 */
export function lookupPhrase(words: readonly string[]): PhraseMatch | undefined {
  if (words.length < 2) return undefined

  const normalized = words.map(normalizeToken)
  if (normalized.some((word) => !word)) return undefined

  const max = Math.min(normalized.length, MAX_PHRASE_WORDS)
  for (let length = max; length >= 2; length -= 1) {
    const window = normalized.slice(0, length)
    const direct = phraseIndex.get(window.join(' '))
    if (direct) return { entry: direct, length }

    const heads = lemmaForms(window[0])
    const tails = lemmaForms(window[length - 1])
    for (const head of heads) {
      for (const tail of tails) {
        const candidate =
          length === 2
            ? `${head} ${tail}`
            : `${head} ${window.slice(1, -1).join(' ')} ${tail}`
        const entry = phraseIndex.get(candidate)
        if (entry) return { entry, length }
      }
    }
  }

  return undefined
}
