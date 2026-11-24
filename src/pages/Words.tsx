import { useMemo, useState } from 'react'
import { allVocabulary, LEVELS } from '../content/vocabulary'
import type { CefrLevel, VocabularyEntry } from '../content/types'
import { vocabularyIllustrations } from '../content/vocabulary/illustrations'
import { getCards } from '../services/cards'
import { State } from '../services/srs'
import type { CardMap } from '../services/srs'
import { AudioButton } from '../components/AudioButton'
import { ExampleSentence } from '../components/ExampleSentence'
import { VocabularyMemoryImage } from '../components/VocabularyMemoryImage'

type LevelFilter = 'all' | CefrLevel
type StateFilter = 'all' | 'new' | 'learning' | 'review'
const PAGE = 120

function stateOf(cards: CardMap, id: string): Exclude<StateFilter, 'all'> {
  const card = cards[id]
  if (!card || card.state === State.New) return 'new'
  if (card.state === State.Learning || card.state === State.Relearning) return 'learning'
  return 'review'
}

const STATE_LABEL: Record<Exclude<StateFilter, 'all'>, string> = {
  new: '未学習',
  learning: '学習中',
  review: '復習',
}

export function Words() {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<LevelFilter>('all')
  const [state, setState] = useState<StateFilter>('all')
  const [limit, setLimit] = useState(PAGE)
  const [expanded, setExpanded] = useState<string | null>(null)
  const cards = useMemo(() => getCards(), [])

  const sorted = useMemo(
    () =>
      [...allVocabulary].sort(
        (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.word.localeCompare(b.word),
      ),
    [],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sorted.filter((entry) => {
      if (level !== 'all' && entry.level !== level) return false
      if (state !== 'all' && stateOf(cards, entry.id) !== state) return false
      if (q === '') return true
      return (
        entry.word.toLowerCase().includes(q) ||
        entry.meaningsJa.some((meaning) => meaning.toLowerCase().includes(q))
      )
    })
  }, [sorted, cards, query, level, state])

  const shown = filtered.slice(0, limit)

  const pickLevel = (value: LevelFilter) => {
    setLevel(value)
    setLimit(PAGE)
    setExpanded(null)
  }
  const pickState = (value: StateFilter) => {
    setState(value)
    setLimit(PAGE)
    setExpanded(null)
  }

  return (
    <div className="page words-page">
      <h1>単語一覧</h1>
      <p className="page-lead">
        {allVocabulary.length.toLocaleString()}件を検索できます。英単語または日本語の意味で絞り込めます。
      </p>

      <div className="words-controls">
        <label className="words-search">
          <span className="visually-hidden">検索</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLimit(PAGE)
              setExpanded(null)
            }}
            placeholder="単語・意味で検索"
            autoComplete="off"
          />
        </label>
        <div className="chip-row" role="group" aria-label="レベルで絞り込む">
          <button type="button" className={`chip${level === 'all' ? ' active' : ''}`} onClick={() => pickLevel('all')}>
            すべて
          </button>
          {LEVELS.map((value) => (
            <button
              key={value}
              type="button"
              className={`chip${level === value ? ' active' : ''}`}
              onClick={() => pickLevel(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="chip-row" role="group" aria-label="習熟度で絞り込む">
          {(['all', 'new', 'learning', 'review'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`chip${state === value ? ' active' : ''}`}
              onClick={() => pickState(value)}
            >
              {value === 'all' ? 'すべて' : STATE_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      <p className="words-count" role="status">
        {filtered.length.toLocaleString()}件
        {filtered.length > shown.length && `（${shown.length.toLocaleString()}件を表示中）`}
      </p>

      {filtered.length === 0 ? (
        <p className="empty-state">条件に合う単語がありません。</p>
      ) : (
        <ul className="word-list">
          {shown.map((entry) => (
            <WordRow
              key={entry.id}
              entry={entry}
              status={stateOf(cards, entry.id)}
              open={expanded === entry.id}
              onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
            />
          ))}
        </ul>
      )}

      {filtered.length > shown.length && (
        <div className="words-more">
          <button type="button" className="btn-secondary" onClick={() => setLimit(limit + PAGE)}>
            さらに表示（残り {(filtered.length - shown.length).toLocaleString()}件）
          </button>
        </div>
      )}
    </div>
  )
}

function WordRow({
  entry,
  status,
  open,
  onToggle,
}: {
  entry: VocabularyEntry
  status: Exclude<StateFilter, 'all'>
  open: boolean
  onToggle: () => void
}) {
  return (
    <li className={`word-row${open ? ' open' : ''}`}>
      <button type="button" className="word-row-main" onClick={onToggle} aria-expanded={open}>
        <span className={`level-badge level-${entry.level.toLowerCase()}`}>{entry.level}</span>
        <span className="word-row-word" lang="en">{entry.word}</span>
        <span className="word-row-pos">{entry.partOfSpeech}</span>
        <span className="word-row-meaning">{entry.meaningsJa[0]}</span>
        <span className={`word-row-state state-${status}`}>{STATE_LABEL[status]}</span>
      </button>
      {open && (
        <div className="word-detail">
          <p className="study-meta">
            {entry.pronunciation && <span className="study-ipa" lang="en">{entry.pronunciation}</span>}
            <span className="study-pos">{entry.partOfSpeech}</span>
            <AudioButton text={entry.word} />
          </p>
          <p className="study-meaning">{entry.meaningsJa.join('、')}</p>
          <div className="study-example">
            <p className="example-en">
              <ExampleSentence key={entry.id} sentence={entry.exampleSentence} />
              <span className="example-audio">
                <AudioButton text={entry.exampleSentence} />
                <AudioButton text={entry.exampleSentence} slow />
              </span>
            </p>
            <p className="example-ja">{entry.exampleTranslationJa}</p>
          </div>
          {vocabularyIllustrations[entry.id] && (
            <VocabularyMemoryImage key={entry.id} illustration={vocabularyIllustrations[entry.id]} />
          )}
        </div>
      )}
    </li>
  )
}
