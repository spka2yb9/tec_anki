import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { lookupWord } from '../services/wordLookup'

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

function tokenize(sentence: string): Token[] {
  return (sentence.match(TOKEN_PATTERN) ?? [sentence]).map((text) => ({
    text,
    isWord: /^[A-Za-z]/.test(text),
  }))
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
      {tokens.map((token, index) => {
        if (!token.isWord) return <Fragment key={index}>{token.text}</Fragment>

        const entry = lookupWord(token.text)
        const open = openIndex === index
        return (
          <span key={index} className="example-word-wrap">
            <button
              type="button"
              className="example-word"
              lang="en"
              aria-expanded={open}
              onClick={(event) => toggleWord(event, index, open)}
            >
              {token.text}
            </button>
            {open && (
              <span className="word-tooltip" role="tooltip" ref={tooltipRef}>
                {entry ? (
                  <>
                    <span className="word-tooltip-head">
                      <span className="word-tooltip-word" lang="en">
                        {entry.word}
                      </span>
                      <span className="word-tooltip-pos">{entry.partOfSpeech}</span>
                    </span>
                    <span className="word-tooltip-meaning">{entry.meaningsJa.join('、')}</span>
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
