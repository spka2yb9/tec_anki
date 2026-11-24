// seeds/*.tsv から新規語彙データ(data.ts)を生成する。
//
// 形式(1行1件、`|` 区切り):
//   word | level | partOfSpeech | meaningsJa(;) | example | exampleJa | collocations(;)
//
// - IPA は OSS の ipa-dict(en_US)から補助。単語が見つからない場合のみ第8フィールドを使う。
// - 既存の8,800語と見出し語が重複する行は捨てる。
// - 単語(空白なし)は「例文に語幹を含む」「コロケーション最低1件が語幹を含む」を検証する。
// - 表現(空白あり)は例文と和訳の存在だけを検証する。
// - 合計が MAX_NEW 件になるよう、単語を優先し、表現は各バッチから均等に採用する。
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { baseVocabulary } from '../src/content/vocabulary/base.ts'

const require = createRequire(import.meta.url)
const IPA_PATH = path.resolve('node_modules/ipa-dict/lib/en_US.js')
const ipa = require(IPA_PATH)

const SEED_DIR = 'src/content/vocabulary/new/seeds'
const OUT = 'src/content/vocabulary/new/data.ts'
/** 合計の目標件数 */
const TARGET_TOTAL = 12_000
/** 既存語は表記ゆれを同一視すると目標より少なくなるため、その差分を新規で埋める。 */
const dedupedBaseCount = new Set(baseVocabulary.map((entry) => normalize(entry.word))).size
const MAX_NEW = TARGET_TOTAL - dedupedBaseCount

function ipaOf(word) {
  const value = ipa instanceof Map ? ipa.get(word.toLowerCase()) : ipa[word.toLowerCase()]
  return Array.isArray(value) && value.length > 0 ? value[0] : ''
}

function stemOf(word) {
  const first = word.split(' ')[0]
  return first.slice(0, Math.max(3, first.length - 3)).toLowerCase()
}

function slug(word) {
  return word.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** 表記ゆれ(full-time / full time など)を同一視する重複判定キー。 */
function normalize(word) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const LEVELS = new Set(['A1', 'A2', 'B1', 'B2'])

const existing = new Set(baseVocabulary.map((entry) => normalize(entry.word)))
const seen = new Set()
const singles = []
const expressionPools = new Map()
const dropped = []
const warnings = []

if (!fs.existsSync(SEED_DIR)) {
  console.error(`seed directory not found: ${SEED_DIR}`)
  process.exit(1)
}

const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.tsv')).sort()
for (const file of files) {
  const lines = fs.readFileSync(path.join(SEED_DIR, file), 'utf8').split('\n')
  lines.forEach((raw, index) => {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) return
    const parts = line.split('|').map((p) => p.trim())
    if (parts.length < 6) {
      warnings.push(`${file}:${index + 1} 列が足りません: ${line}`)
      return
    }
    const [word, level, pos, meaningsRaw, example, exampleJa, collocRaw = '', ipaRaw = ''] = parts
    if (!LEVELS.has(level)) {
      warnings.push(`${file}:${index + 1} 不正なレベル: ${level}`)
      return
    }
    const key = normalize(word)
    if (existing.has(key)) {
      dropped.push(word)
      return
    }
    if (seen.has(key)) {
      dropped.push(`${word} (seed重複)`)
      return
    }
    const meanings = meaningsRaw.split(';').map((m) => m.trim()).filter(Boolean)
    const collocations = collocRaw.split(';').map((c) => c.trim()).filter(Boolean)
    const isExpression = word.includes(' ')
    if (meanings.length === 0) {
      warnings.push(`${word}: 意味が空です`)
      return
    }
    if (!example || !exampleJa) {
      warnings.push(`${word}: 例文または和訳が空です`)
      return
    }
    const stem = stemOf(word)
    if (!isExpression) {
      if (!example.toLowerCase().includes(stem)) warnings.push(`${word}: 例文に語幹「${stem}」がありません`)
      if (collocations.length === 0) warnings.push(`${word}: コロケーションがありません`)
      else if (!collocations.some((c) => c.toLowerCase().includes(stem))) {
        warnings.push(`${word}: コロケーションに語幹「${stem}」がありません`)
      }
    }
    const pronunciation = ipaRaw || (isExpression ? '' : ipaOf(word.split(' ')[0]))
    if (!isExpression && !pronunciation) warnings.push(`${word}: IPAが見つかりません`)
    seen.add(key)
    const entry = {
      id: slug(word),
      word,
      level,
      partOfSpeech: pos.replace(/\(.*?\)/g, '').trim(),
      meaningsJa: meanings,
      pronunciation,
      exampleSentence: example,
      exampleTranslationJa: exampleJa,
      ...(collocations.length > 0 ? { collocations } : {}),
    }
    if (isExpression) {
      if (!expressionPools.has(file)) expressionPools.set(file, [])
      expressionPools.get(file).push(entry)
    } else {
      singles.push(entry)
    }
  })
}

// 単語を優先し、表現は各バッチから1件ずつ順に取って偏りをなくす。
const selected = [...singles]
const queues = [...expressionPools.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, list]) => [...list])
while (selected.length < MAX_NEW && queues.some((queue) => queue.length > 0)) {
  for (const queue of queues) {
    if (selected.length >= MAX_NEW) break
    const next = queue.shift()
    if (next) selected.push(next)
  }
}

const body = `// 自動生成ファイル。編集せず seeds/*.tsv を更新して \`node scripts/build-new-vocab.mjs\` を実行する。
import type { VocabularyEntry } from '../../types'

export const newVocabularyData: VocabularyEntry[] = ${JSON.stringify(selected, null, 2)}
`
fs.writeFileSync(OUT, body)

const byLevel = {}
for (const entry of selected) byLevel[entry.level] = (byLevel[entry.level] ?? 0) + 1
const candidates = singles.length + [...expressionPools.values()].reduce((n, list) => n + list.length, 0)
console.log(`candidates: ${candidates} / accepted: ${selected.length} / dropped: ${dropped.length}`)
console.log(`singles: ${singles.length} / expressions available: ${candidates - singles.length}`)
console.log('levels:', byLevel)
if (dropped.length > 0) console.log('dropped sample:', dropped.slice(0, 20).join(', '))
if (warnings.length > 0) {
  console.log(`warnings: ${warnings.length}`)
  console.log(warnings.slice(0, 40).join('\n'))
}
