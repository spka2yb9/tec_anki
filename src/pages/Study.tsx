import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { findWord } from '../content/vocabulary'
import { vocabularyIllustrations } from '../content/vocabulary/illustrations'
import { AudioButton } from '../components/AudioButton'
import { ExampleSentence } from '../components/ExampleSentence'
import { VocabularyMemoryImage } from '../components/VocabularyMemoryImage'
import { getCards, saveCards } from '../services/cards'
import { getSettings } from '../services/settings'
import { todayStat, recordReview } from '../services/daily'
import { recordStudyDay } from '../services/studyDays'
import { buildTodayPlan } from '../services/queue'
import {
  newCard,
  previewGrades,
  reviewCard,
  requeueAfterMs,
  isNew,
  Rating,
  type CardMap,
  type GradePreview,
  type ReviewGrade,
  type StoredCard,
} from '../services/srs'
import { completeCard, continueNow, remainingCount, startSession, type SessionState } from '../services/session'
import { flushPush } from '../services/sync'
import { NORMAL_RATE, speechService } from '../services/speech'

const RATING_BUTTONS = [
  { grade: Rating.Again, key: '1', label: 'もう一度', tone: 'again' },
  { grade: Rating.Hard, key: '2', label: '難しい', tone: 'hard' },
  { grade: Rating.Good, key: '3', label: '普通', tone: 'good' },
  { grade: Rating.Easy, key: '4', label: '簡単', tone: 'easy' },
] as const

type PreviewMap = Record<number, GradePreview>

function freshSession(): SessionState {
  const plan = buildTodayPlan(getCards(), getSettings(), todayStat())
  return startSession([...plan.reviewIds, ...plan.newIds])
}

export function Study() {
  const [session, setSession] = useState<SessionState>(freshSession)
  const [card, setCard] = useState<StoredCard | null>(null)
  const [preview, setPreview] = useState<PreviewMap | null>(null)
  const [revealedFor, setRevealedFor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(() => Date.now())
  const cardsRef = useRef<CardMap>(getCards())
  const word = session.current ? findWord(session.current) : undefined
  const currentId = session.current
  const waitUntil = session.waitUntil
  const revealKey = currentId === null ? null : `${currentId}:${session.answered}`
  const revealed = revealKey !== null && revealedFor === revealKey

  // 現在のカードを用意(未学習語はメモリ上だけ。最初の回答時に保存する)
  useEffect(() => {
    const id = currentId
    if (!id) return
    let cancelled = false
    void (async () => {
      const current = cardsRef.current[id] ?? (await newCard(id))
      const grades = await previewGrades(current)
      if (!cancelled) {
        setCard(current)
        setPreview(grades)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentId, session.answered])

  // 完了したら Gist へ即送信
  useEffect(() => {
    if (session.finished) flushPush()
  }, [session.finished])

  // 学習ステップ待ちのカウントダウン
  useEffect(() => {
    if (currentId !== null || waitUntil === null) return
    const timer = setInterval(() => {
      setTick(Date.now())
      setSession((s) =>
        s.current === null && s.waitUntil !== null && Date.now() >= s.waitUntil ? continueNow(s) : s,
      )
    }, 500)
    return () => clearInterval(timer)
  }, [currentId, waitUntil])

  const rate = useCallback(
    async (grade: ReviewGrade) => {
      const id = currentId
      if (!id || !card || !revealed || busy) return
      setBusy(true)
      try {
        const at = new Date()
        const wasNew = isNew(card)
        const next = await reviewCard(card, grade, at)
        const map = { ...cardsRef.current, [id]: next }
        cardsRef.current = map
        saveCards(map)
        recordReview(grade, wasNew, at)
        recordStudyDay()
        const delta = requeueAfterMs(next, at.getTime())
        setSession((s) => completeCard(s, delta === null ? null : at.getTime() + delta, at.getTime()))
      } finally {
        setBusy(false)
      }
    },
    [currentId, card, revealed, busy],
  )

  const replay = useCallback(() => {
    if (!word) return
    void speechService.speak(word.word, { rate: NORMAL_RATE })
  }, [word])

  // キーボード: Space/Enter で答え表示、1〜4 で評価、R で再生
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      if (currentId === null) return
      if (!revealed) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          setRevealedFor(revealKey)
        }
        return
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        replay()
        return
      }
      const found = RATING_BUTTONS.find((button) => button.key === e.key)
      if (found) {
        e.preventDefault()
        void rate(found.grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentId, revealKey, revealed, rate, replay])

  const restart = () => {
    cardsRef.current = getCards()
    setSession(freshSession())
  }

  if (session.total === 0) {
    return (
      <div className="page study-page">
        <h1>Anki</h1>
        <div className="empty-state">
          <p className="eyebrow">今日の分は完了</p>
          <h2>出題するカードがありません</h2>
          <div className="home-actions">
            <Link className="btn-primary" to="/words">単語一覧を見る</Link>
          </div>
        </div>
      </div>
    )
  }

  if (session.finished) {
    return (
      <div className="page study-page">
        <h1>Anki</h1>
        <div className="study-complete" role="status">
          <p className="study-complete-mark" aria-hidden="true">✓</p>
          <h2>今日のセッション完了</h2>
          <p>
            {session.total}枚を出題し、{session.answered}回回答しました。
            期日が来た復習と新しい単語の処理が終わっています。
          </p>
          <div className="home-actions">
            <Link className="btn-primary btn-large" to="/words">単語一覧を見る</Link>
            <button type="button" className="btn-secondary btn-large" onClick={restart}>
              もう一度
            </button>
          </div>
        </div>
      </div>
    )
  }

  const remaining = remainingCount(session)
  const progress = Math.max(0, Math.min(100, (1 - remaining / Math.max(session.total, 1)) * 100))
  const waiting = session.current === null && session.waitUntil !== null
  const seconds = session.waitUntil === null ? 0 : Math.max(0, Math.ceil((session.waitUntil - tick) / 1000))

  return (
    <div className="page study-page">
      <div className="study-head">
        <h1>Anki</h1>
        <p className="study-progress-text">
          残り {remaining}枚 ・ {session.answered}回回答
        </p>
      </div>
      <div className="study-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {waiting ? (
        <div className="study-wait" role="status">
          <p className="study-wait-label">学習ステップの待ち時間です</p>
          <p className="study-wait-time">{formatClock(seconds)}</p>
          <p className="study-wait-note">あと{seconds}秒で次のカードを出します。待たずに続けることもできます。</p>
          <button type="button" className="btn-primary" onClick={() => setSession((s) => continueNow(s))}>
            今すぐ続ける
          </button>
        </div>
      ) : !word || !card ? (
        <div className="page-loading" role="status">カードを準備しています…</div>
      ) : (
        <article className={`study-card${revealed ? ' revealed' : ''}`}>
          <div className="study-front">
            <p className="study-word" lang="en">
              {word.word}
              <AudioButton text={word.word} />
            </p>
            {!revealed && (
              <p className="study-front-hint">意味を思い出してから答えを表示してください。</p>
            )}
            {!revealed && (
              <button type="button" className="btn-primary btn-large study-reveal" onClick={() => setRevealedFor(revealKey)}>
                答えを表示 <span className="study-key">Space</span>
              </button>
            )}
          </div>

          {revealed && (
            <div className="study-back">
              <div className="study-meta">
                {word.pronunciation && <span className="study-ipa" lang="en">{word.pronunciation}</span>}
                <span className="study-pos">{word.partOfSpeech}</span>
                <span className={`level-badge level-${word.level.toLowerCase()}`}>{word.level}</span>
              </div>
              <p className="study-meaning">{word.meaningsJa.join('、')}</p>

              <div className="study-example">
                <p className="example-en">
                  <ExampleSentence key={word.id} sentence={word.exampleSentence} />
                  <span className="example-audio">
                    <AudioButton text={word.exampleSentence} />
                    <AudioButton text={word.exampleSentence} slow />
                  </span>
                </p>
                <p className="example-ja">{word.exampleTranslationJa}</p>
              </div>

              {vocabularyIllustrations[word.id] && (
                <VocabularyMemoryImage key={word.id} illustration={vocabularyIllustrations[word.id]} />
              )}

              <div className="rating-row" role="group" aria-label="回答を評価">
                {RATING_BUTTONS.map((button) => (
                  <button
                    key={button.grade}
                    type="button"
                    className={`rating-btn rating-${button.tone}`}
                    disabled={busy || preview === null}
                    onClick={() => void rate(button.grade)}
                  >
                    <span className="rating-label">{button.label}</span>
                    <span className="rating-next">{preview?.[button.grade]?.label ?? '…'}</span>
                    <span className="rating-key">{button.key}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </article>
      )}

      {!revealed && (
        <div className="study-keybar">
          <p>Space または Enter で答えを表示</p>
        </div>
      )}
    </div>
  )
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
