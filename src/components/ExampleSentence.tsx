import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import type { VocabularyEntry } from '../content/types'
import { lookupPhrase, lookupWord } from '../services/wordLookup'

const TOKEN_PATTERN = /[A-Za-z]+(?:['’][A-Za-z]+)*|[^A-Za-z]+/g

type Token = { text: string; isWord: boolean }

type Anchor = {
  left: number
  top: number
  bottom: number
  width: number
}

type ActiveWord = {
  sentence: string
  index: number
  anchor: Anchor
}

/** 表示の単位。熟語は複数の語をまとめて1つのボタンにする。 */
type Segment =
  | { kind: 'text'; key: number; text: string }
  | { kind: 'word'; key: number; text: string; entry: VocabularyEntry | undefined }

function tokenize(sentence: string): Token[] {
  return (sentence.match(TOKEN_PATTERN) ?? [sentence]).map((text) => ({
    text,
    isWord: /^[A-Za-z]/.test(text),
  }))
}

/** 空白だけを挟んで連続する語を集める。句読点が入るとそこで区切る。 */
function collectWords(tokens: Token[], start: number): { words: string[]; indexes: number[] } {
  const words: string[] = []
  const indexes: number[] = []
  let index = start
  while (index < tokens.length && tokens[index].isWord) {
    words.push(tokens[index].text)
    indexes.push(index)
    index += 1

    const gap = tokens[index]
    if (gap && /^\s+$/.test(gap.text) && tokens[index + 1]?.isWord) {
      index += 1
      continue
    }
    break
  }
  return { words, indexes }
}

/** 例文を、テキストまたはタップ可能な語(熟語を含む)へ分割する。 */
function buildSegments(tokens: Token[]): Segment[] {
  const segments: Segment[] = []
  let index = 0
  while (index < tokens.length) {
    const token = tokens[index]
    if (!token.isWord) {
      segments.push({ kind: 'text', key: index, text: token.text })
      index += 1
      continue
    }

    const { words, indexes } = collectWords(tokens, index)
    const phrase = lookupPhrase(words)
    if (phrase && phrase.length > 1) {
      const endIndex = indexes[phrase.length - 1]
      const text = tokens
        .slice(index, endIndex + 1)
        .map((part) => part.text)
        .join('')
      segments.push({ kind: 'word', key: index, text, entry: phrase.entry })
      index = endIndex + 1
      continue
    }

    segments.push({ kind: 'word', key: index, text: token.text, entry: lookupWord(token.text) })
    index += 1
  }
  return segments
}

type ExampleSentenceProps = {
  sentence: string
}

/** 例文の各単語をタップすると意味のツールチップを表示する。 */
export function ExampleSentence({ sentence }: ExampleSentenceProps) {
  const [active, setActive] = useState<ActiveWord | null>(null)
  const rootRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const tokens = useMemo(() => tokenize(sentence), [sentence])
  const segments = useMemo(() => buildSegments(tokens), [tokens])
  const openIndex = active?.sentence === sentence ? active.index : null

  // タップした語の位置を基準に、画面からはみ出さない位置へツールチップを置く。
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current
    if (!tooltip || !active || openIndex === null) return
    const margin = 8
    const { anchor } = active
    const width = tooltip.offsetWidth
    const height = tooltip.offsetHeight
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const centered = anchor.left + anchor.width / 2 - width / 2
    const left = Math.max(margin, Math.min(centered, viewportWidth - width - margin))

    let top = anchor.top - height - margin
    if (top < margin) top = Math.min(anchor.bottom + margin, viewportHeight - height - margin)

    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
  }, [active, openIndex])

  useEffect(() => {
    if (openIndex === null) return
    const close = () => setActive(null)
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [openIndex])

  const toggleWord = (event: MouseEvent<HTMLButtonElement>, index: number, open: boolean) => {
    if (open) {
      setActive(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    setActive({
      sentence,
      index,
      anchor: { left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width },
    })
  }

  return (
    <span className="example-sentence" ref={rootRef}>
      {segments.map((segment) => {
        if (segment.kind === 'text') return <Fragment key={segment.key}>{segment.text}</Fragment>

        const open = openIndex === segment.key
        return (
          <span key={segment.key} className="example-word-wrap">
            <button
              type="button"
              className="example-word"
              lang="en"
              aria-expanded={open}
              onClick={(event) => toggleWord(event, segment.key, open)}
            >
              {segment.text}
            </button>
            {open && (
              <span className="word-tooltip" role="tooltip" ref={tooltipRef}>
                {segment.entry ? (
                  <>
                    <span className="word-tooltip-head">
                      <span className="word-tooltip-word" lang="en">
                        {segment.entry.word}
                      </span>
                      <span className="word-tooltip-pos">{segment.entry.partOfSpeech}</span>
                    </span>
                    <span className="word-tooltip-meaning">
                      {segment.entry.meaningsJa.join('、')}
                    </span>
                  </>
                ) : (
                  <span className="word-tooltip-meaning">この辞書には未収録です</span>
                )}
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
