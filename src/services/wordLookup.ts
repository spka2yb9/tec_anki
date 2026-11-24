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
