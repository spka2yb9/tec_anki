import { useMemo } from 'react'
import { getCards } from '../services/cards'
import { getDaily, todayStat } from '../services/daily'
import { getSettings } from '../services/settings'
import { currentStreak, longestStreak, totalStudyDays as countStudyDays } from '../services/studyDays'
import {
  activityCalendar,
  activitySummary,
  answerSummary,
  countStates,
  dailySeries,
  forecast,
  levelProgress,
  maturityBuckets,
  overdueCount,
  ratingTotals,
  weekTotals,
  type CalendarCell,
} from '../services/stats'

export function Stats() {
  const data = useMemo(() => {
    const cards = getCards()
    const daily = getDaily()
    const ratings = ratingTotals(daily)
    const calendar = activityCalendar(daily, 12)
    const cells = calendar.weeks.flat().filter((cell): cell is CalendarCell => cell !== null)
    return {
      counts: countStates(cards),
      maturity: maturityBuckets(cards),
      levels: levelProgress(cards),
      forecast: forecast(cards, 14),
      series: dailySeries(daily, 14),
      ratings,
      answers: answerSummary(ratings),
      activity: activitySummary(daily, 14),
      week: weekTotals(daily),
      overdue: overdueCount(cards),
      calendar,
      calendarActive: cells.filter((cell) => cell.total > 0).length,
      calendarTotal: cells.reduce((sum, cell) => sum + cell.total, 0),
      today: todayStat(),
      settings: getSettings(),
      streak: currentStreak(),
      best: longestStreak(),
      studyDays: countStudyDays(),
    }
  }, [])

  const { counts, maturity, ratings, answers, week, today, settings, activity } = data
  const masteredPct = counts.total === 0 ? 0 : Math.round((counts.review / counts.total) * 100)
  const maturePct = maturity.total === 0 ? 0 : Math.round((maturity.mature / maturity.total) * 100)
  const started = counts.total - counts.unseen
  const ratingTotal = answers.total
  const ratingPct = (n: number) => (ratingTotal === 0 ? 0 : Math.round((n / ratingTotal) * 100))
  const maxActivityRaw = Math.max(0, ...data.series.map((day) => day.total))
  const maxActivity = Math.max(1, maxActivityRaw)
  const maxForecast = Math.max(1, ...data.forecast.map((day) => day.count))
  const forecastTotal = data.forecast.reduce((sum, day) => sum + day.count, 0)

  const segments: DonutSegment[] = [
    { key: 'mature', label: '成熟', value: maturity.mature, color: 'var(--teal)' },
    { key: 'young', label: '育成', value: maturity.young, color: 'var(--blue)' },
    { key: 'learning', label: '学習中', value: maturity.learning, color: 'var(--gold)' },
    { key: 'fresh', label: '未学習', value: maturity.fresh, color: '#cfdadd' },
  ]

  const ratingSegments = [
    { key: 'again', value: ratings.again },
    { key: 'hard', value: ratings.hard },
    { key: 'good', value: ratings.good },
    { key: 'easy', value: ratings.easy },
  ]

  return (
    <div className="page stats-page">
      <h1>統計</h1>
      <p className="page-lead">学習の積み上がりと、これからの復習量を確認できます。</p>

      <section className="panel stat-hero" aria-labelledby="overview-stats">
        <div className="panel-head">
          <h2 id="overview-stats">学習の全体像</h2>
          <span className="panel-sub">学習済み {started.toLocaleString()} / {counts.total.toLocaleString()}語</span>
        </div>
        <div className="stat-hero-body">
          <StateDonut segments={segments} centerValue={`${maturePct}%`} centerLabel="成熟率" total={maturity.total} />
          <div className="stat-hero-side">
            <ul className="donut-legend" aria-label="成熟度の内訳">
              {segments.map((segment) => {
                const pct = maturity.total === 0 ? 0 : Math.round((segment.value / maturity.total) * 100)
                return (
                  <li key={segment.key} className="donut-legend-row">
                    <span className="donut-swatch" style={{ background: segment.color }} aria-hidden="true" />
                    <span className="donut-legend-label">{segment.label}</span>
                    <span className="donut-legend-value">{segment.value.toLocaleString()}</span>
                    <span className="donut-legend-pct">{pct}%</span>
                  </li>
                )
              })}
            </ul>
            <div className="goal-block">
              <p className="goal-title">今日の目標</p>
              <GoalBar label="新規" done={today.newCards} goal={settings.newPerDay} tone="new" />
              <GoalBar label="復習" done={today.reviews} goal={settings.reviewsPerDay} tone="review" />
            </div>
          </div>
        </div>
      </section>

      <section className="stat-cards" aria-label="学習の指標">
        <div className="stat-card">
          <span className="stat-label">定着</span>
          <strong className="stat-value">{counts.review.toLocaleString()}</strong>
          <span className="stat-sub">収録の{masteredPct}%（学習中 {counts.learning.toLocaleString()}）</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">正答率</span>
          <strong className="stat-value">{answers.accuracyPct}%</strong>
          <span className="stat-sub">全 {answers.total.toLocaleString()}回 の回答</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">今週</span>
          <strong className="stat-value">{week.thisWeek.toLocaleString()}</strong>
          <span className="stat-sub">
            前週 {week.lastWeek.toLocaleString()}枚
            {week.deltaPct !== null && (
              <span className={week.deltaPct >= 0 ? 'stat-trend trend-up' : 'stat-trend trend-down'}>
                {week.deltaPct >= 0 ? '+' : ''}
                {week.deltaPct}%
              </span>
            )}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">連続</span>
          <strong className="stat-value">{data.streak}</strong>
          <span className="stat-sub">日（最長 {data.best}日・合計 {data.studyDays}日）</span>
        </div>
      </section>

      <section className="panel" aria-labelledby="level-stats">
        <div className="panel-head">
          <h2 id="level-stats">レベル別</h2>
          <span className="panel-sub">淡色=着手 / 濃色=定着</span>
        </div>
        <ul className="level-bars">
          {data.levels.map((row) => {
            const startedPct = row.total === 0 ? 0 : (row.started / row.total) * 100
            const learnedPct = row.total === 0 ? 0 : (row.learned / row.total) * 100
            return (
              <li key={row.level} className="level-row">
                <span className={`level-badge level-${row.level.toLowerCase()}`}>{row.level}</span>
                <span className="level-track">
                  <span className="level-track-started" style={{ width: `${startedPct}%` }} />
                  <span className="level-track-learned" style={{ width: `${learnedPct}%` }} />
                </span>
                <span className="level-num">
                  {row.learned.toLocaleString()} / {row.total.toLocaleString()}
                  <span className="level-pct">{Math.round(learnedPct)}%</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel" aria-labelledby="forecast-stats">
        <div className="panel-head">
          <h2 id="forecast-stats">今後14日の復習</h2>
          {data.overdue > 0 ? (
            <span className="forecast-overdue">延滞 {data.overdue.toLocaleString()}枚</span>
          ) : (
            <span className="panel-sub">合計 {forecastTotal.toLocaleString()}枚</span>
          )}
        </div>
        <div className="forecast-scroll">
          <div className="forecast" role="img" aria-label={forecastAlt(data.forecast)}>
            {data.forecast.map((day, i) => (
              <div key={day.date} className="forecast-col">
                <span className="forecast-count">{day.count}</span>
                <span className="forecast-bar" style={{ height: `${Math.max(4, (day.count / maxForecast) * 100)}%` }} />
                <span className="forecast-label">{i === 0 ? '今日' : i % 3 === 0 ? short(day.date) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="stats-two">
        <section className="panel" aria-labelledby="activity-stats">
          <div className="panel-head">
            <h2 id="activity-stats">直近14日の学習量</h2>
            <span className="panel-sub">
              学習 {activity.activeDays}日・平均 {activity.averagePerActiveDay}枚
            </span>
          </div>
          <div className="activity-bars" role="img" aria-label={activityAlt(data.series)}>
            {data.series.map((day) => {
              const height = day.total === 0 ? 0 : Math.max(4, (day.total / maxActivity) * 100)
              const newPct = day.total === 0 ? 0 : (day.newCards / day.total) * 100
              const reviewPct = day.total === 0 ? 0 : (day.reviews / day.total) * 100
              return (
                <span
                  key={day.date}
                  className="activity-slot"
                  title={`${short(day.date)} 復習${day.reviews}・新規${day.newCards}`}
                >
                  <span className="activity-bar" style={{ height: `${height}%` }}>
                    {day.total > 0 && (
                      <>
                        <span className="activity-seg activity-seg-new" style={{ height: `${newPct}%` }} />
                        <span className="activity-seg activity-seg-review" style={{ height: `${reviewPct}%` }} />
                      </>
                    )}
                  </span>
                </span>
              )
            })}
          </div>
          <p className="chart-axis">
            <span>{short(data.series[0]?.date)}</span>
            <span className="chart-axis-max">最大 {maxActivityRaw}枚/日</span>
            <span>{short(data.series[data.series.length - 1]?.date)}</span>
          </p>
          <ul className="chart-legend">
            <li><span className="chart-legend-swatch activity-seg-review" aria-hidden="true" />復習</li>
            <li><span className="chart-legend-swatch activity-seg-new" aria-hidden="true" />新規</li>
          </ul>
        </section>

        <section className="panel" aria-labelledby="calendar-stats">
          <div className="panel-head">
            <h2 id="calendar-stats">学習カレンダー</h2>
            <span className="panel-sub">
              直近12週間で {data.calendarActive}日・合計 {data.calendarTotal.toLocaleString()}回
            </span>
          </div>
          <div
            className="heatmap"
            role="img"
            aria-label={`直近12週間の学習カレンダー: 学習した日 ${data.calendarActive}日`}
          >
            {data.calendar.weeks.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map((cell, di) =>
                  cell ? (
                    <span
                      key={cell.date}
                      className={`heatmap-day heat-${cell.level}`}
                      title={`${cell.date} ${cell.total}回`}
                    />
                  ) : (
                    <span key={`empty-${wi}-${di}`} className="heatmap-day heat-empty" aria-hidden="true" />
                  ),
                )}
              </div>
            ))}
          </div>
          <p className="chart-legend heatmap-legend">
            <span>少</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} className={`chart-legend-swatch heat-${level}`} aria-hidden="true" />
            ))}
            <span>多</span>
          </p>
        </section>
      </div>

      <section className="panel" aria-labelledby="rating-stats">
        <div className="panel-head">
          <h2 id="rating-stats">評価の内訳</h2>
          <span className="panel-sub">全期間 {ratingTotal.toLocaleString()}回</span>
        </div>
        <div className="rating-stack" aria-hidden="true">
          {ratingSegments.map((segment) =>
            segment.value > 0 ? (
              <span
                key={segment.key}
                className={`rating-seg rating-${segment.key}`}
                style={{ flexGrow: segment.value }}
              />
            ) : null,
          )}
        </div>
        <div className="rating-totals">
          <span className="rating-total again">
            <strong>{ratings.again}</strong>
            <span className="rating-label">もう一度</span>
            <span className="rating-pct">{ratingPct(ratings.again)}%</span>
          </span>
          <span className="rating-total hard">
            <strong>{ratings.hard}</strong>
            <span className="rating-label">難しい</span>
            <span className="rating-pct">{ratingPct(ratings.hard)}%</span>
          </span>
          <span className="rating-total good">
            <strong>{ratings.good}</strong>
            <span className="rating-label">普通</span>
            <span className="rating-pct">{ratingPct(ratings.good)}%</span>
          </span>
          <span className="rating-total easy">
            <strong>{ratings.easy}</strong>
            <span className="rating-label">簡単</span>
            <span className="rating-pct">{ratingPct(ratings.easy)}%</span>
          </span>
        </div>
        <p className="panel-note">
          正答率 {answers.accuracyPct}%（もう一度を除く {answers.correct.toLocaleString()}回）。
          今日は復習 {today.reviews}枚・新規 {today.newCards}語を学習しました。
        </p>
      </section>
    </div>
  )
}

type DonutSegment = { key: string; label: string; value: number; color: string }

function StateDonut({
  segments,
  centerValue,
  centerLabel,
  total,
}: {
  segments: DonutSegment[]
  centerValue: string
  centerLabel: string
  total: number
}) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const label = segments.map((segment) => `${segment.label} ${segment.value}`).join('、')
  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 140 140" role="img" aria-label={label}>
        <g transform="rotate(-90 70 70)">
          <circle className="donut-track" cx="70" cy="70" r={radius} />
          {total > 0 &&
            segments.map((segment) => {
              const length = (segment.value / total) * circumference
              const dash = {
                stroke: segment.color,
                strokeDasharray: `${length} ${circumference - length}`,
                strokeDashoffset: -offset,
              }
              offset += length
              return <circle key={segment.key} className="donut-seg" cx="70" cy="70" r={radius} style={dash} />
            })}
        </g>
      </svg>
      <div className="donut-center">
        <strong>{centerValue}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  )
}

function GoalBar({ label, done, goal, tone }: { label: string; done: number; goal: number; tone: 'new' | 'review' }) {
  const pct = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0
  return (
    <div className="goal-row">
      <span className="goal-label">{label}</span>
      <span className={`goal-track goal-${tone}`}>
        <span className="goal-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="goal-count">{goal > 0 ? `${done} / ${goal}` : '上限なし'}</span>
    </div>
  )
}

function short(date: string | undefined): string {
  if (!date) return ''
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
}

function forecastAlt(days: { date: string; count: number }[]): string {
  return `今後14日の復習: ${days.map((day) => `${short(day.date)} ${day.count}枚`).join('、')}`
}

function activityAlt(days: { date: string; total: number; reviews: number; newCards: number }[]): string {
  const active = days.filter((day) => day.total > 0)
  return active.length === 0
    ? '直近14日は学習記録がありません'
    : `直近14日の学習量: ${active
        .map((day) => `${short(day.date)} 復習${day.reviews}・新規${day.newCards}`)
        .join('、')}`
}
