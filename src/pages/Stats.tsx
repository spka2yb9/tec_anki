import { useMemo } from 'react'
import { getCards } from '../services/cards'
import { getDaily, todayStat } from '../services/daily'
import { longestStreak, currentStreak, totalStudyDays } from '../services/studyDays'
import { countStates, dailySeries, forecast, levelProgress, ratingTotals } from '../services/stats'

export function Stats() {
  const data = useMemo(() => {
    const cards = getCards()
    const daily = getDaily()
    return {
      counts: countStates(cards),
      levels: levelProgress(cards),
      forecast: forecast(cards, 7),
      series: dailySeries(daily, 14),
      ratings: ratingTotals(daily),
      today: todayStat(),
      streak: currentStreak(),
      best: longestStreak(),
      days: totalStudyDays(),
    }
  }, [])

  const { counts, ratings } = data
  const masteredPct = counts.total === 0 ? 0 : Math.round((counts.review / counts.total) * 100)
  const ratingTotal = ratings.again + ratings.hard + ratings.good + ratings.easy
  const maxDay = Math.max(1, ...data.series.map((day) => day.total))
  const maxForecast = Math.max(1, ...data.forecast.map((day) => day.count))

  return (
    <div className="page stats-page">
      <h1>統計</h1>
      <p className="page-lead">学習の積み上がりと、これからの復習量を確認できます。</p>

      <section className="stat-cards" aria-label="全体の進捗">
        <div className="stat-card">
          <span className="stat-label">定着</span>
          <strong className="stat-value">{counts.review.toLocaleString()}</strong>
          <span className="stat-sub">収録の{masteredPct}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">学習中</span>
          <strong className="stat-value">{counts.learning.toLocaleString()}</strong>
          <span className="stat-sub">復習待ち</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">未学習</span>
          <strong className="stat-value">{counts.unseen.toLocaleString()}</strong>
          <span className="stat-sub">収録 {counts.total.toLocaleString()}件</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">連続</span>
          <strong className="stat-value">{data.streak}</strong>
          <span className="stat-sub">日（最長 {data.best}日・合計 {data.days}日）</span>
        </div>
      </section>

      <section className="panel" aria-labelledby="level-stats">
        <div className="panel-head">
          <h2 id="level-stats">レベル別</h2>
          <span className="panel-sub">定着件数 / 収録件数</span>
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
                <span className="level-num">{row.learned.toLocaleString()} / {row.total.toLocaleString()}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="stats-two">
        <section className="panel" aria-labelledby="forecast-stats">
          <div className="panel-head">
            <h2 id="forecast-stats">今後7日の復習</h2>
          </div>
          <div className="forecast" role="img" aria-label={forecastAlt(data.forecast)}>
            {data.forecast.map((day, i) => (
              <div key={day.date} className="forecast-col">
                <span className="forecast-count">{day.count}</span>
                <span className="forecast-bar" style={{ height: `${Math.max(4, (day.count / maxForecast) * 100)}%` }} />
                <span className="forecast-label">
                  {i === 0 ? '今日' : `${Number(day.date.slice(5, 7))}/${Number(day.date.slice(8, 10))}`}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="activity-stats">
          <div className="panel-head">
            <h2 id="activity-stats">直近14日の学習量</h2>
            <span className="panel-sub">復習 + 新規</span>
          </div>
          <div className="activity-bars" role="img" aria-label={activityAlt(data.series)}>
            {data.series.map((day) => (
              <span key={day.date} className="activity-slot" title={`${day.date} 復習${day.reviews}・新規${day.newCards}`}>
                <span className="activity-bar" style={{ height: `${Math.max(2, (day.total / maxDay) * 100)}%` }} />
              </span>
            ))}
          </div>
          <p className="chart-axis">
            <span>{short(data.series[0]?.date)}</span>
            <span className="chart-axis-max">最大 {maxDay}枚/日</span>
            <span>{short(data.series[data.series.length - 1]?.date)}</span>
          </p>
        </section>
      </div>

      <section className="panel" aria-labelledby="rating-stats">
        <div className="panel-head">
          <h2 id="rating-stats">評価の内訳</h2>
          <span className="panel-sub">全期間 {ratingTotal.toLocaleString()}回</span>
        </div>
        <div className="rating-totals">
          <span className="rating-total again"><strong>{ratings.again}</strong>もう一度</span>
          <span className="rating-total hard"><strong>{ratings.hard}</strong>難しい</span>
          <span className="rating-total good"><strong>{ratings.good}</strong>普通</span>
          <span className="rating-total easy"><strong>{ratings.easy}</strong>簡単</span>
        </div>
        <p className="panel-note">
          今日は復習 {data.today.reviews}枚・新規 {data.today.newCards}語を学習しました。
        </p>
      </section>
    </div>
  )
}

function short(date: string | undefined): string {
  if (!date) return ''
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
}

function forecastAlt(days: { date: string; count: number }[]): string {
  return `今後7日の復習: ${days.map((day) => `${short(day.date)} ${day.count}枚`).join('、')}`
}

function activityAlt(days: { date: string; total: number }[]): string {
  const active = days.filter((day) => day.total > 0)
  return active.length === 0
    ? '直近14日は学習記録がありません'
    : `直近14日の学習量: ${active.map((day) => `${short(day.date)} ${day.total}枚`).join('、')}`
}
