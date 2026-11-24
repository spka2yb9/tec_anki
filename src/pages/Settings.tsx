import { useState } from 'react'
import { SyncPanel } from '../components/SyncPanel'
import { DEFAULT_SETTINGS, getSettings, saveSettings, type Settings as SettingsValues } from '../services/settings'
import { resetProgress } from '../services/storage'

export function Settings() {
  const [values, setValues] = useState<SettingsValues>(getSettings)
  const [saved, setSaved] = useState(false)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = saveSettings(values)
    setValues(clean)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const reset = () => {
    if (!window.confirm('学習の進捗（カード・日次記録・学習日）をすべて削除します。よいですか？')) return
    resetProgress(['tecanki.cards', 'tecanki.daily', 'tecanki.studyDays'])
    location.reload()
  }

  return (
    <div className="page settings-page">
      <h1>設定</h1>
      <p className="page-lead">1日の学習量と、進捗の同期・リセットを管理します。</p>

      <section className="panel" aria-labelledby="limits-title">
        <h2 id="limits-title">1日の学習量</h2>
        <p className="panel-note">
          復習アルゴリズム（FSRS-6）の値は固定です。ここでは1日に出す枚数だけを変更できます。
        </p>
        <form className="settings-form" onSubmit={save}>
          <label className="settings-field">
            <span>新規（件/日）</span>
            <input
              type="number"
              min={0}
              max={999}
              inputMode="numeric"
              value={values.newPerDay}
              onChange={(e) => setValues({ ...values, newPerDay: Number(e.target.value) })}
            />
          </label>
          <label className="settings-field">
            <span>復習（枚/日）</span>
            <input
              type="number"
              min={0}
              max={999}
              inputMode="numeric"
              value={values.reviewsPerDay}
              onChange={(e) => setValues({ ...values, reviewsPerDay: Number(e.target.value) })}
            />
          </label>
          <div className="settings-actions">
            <button type="submit" className="btn-primary">保存する</button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setValues(DEFAULT_SETTINGS)}
            >
              既定に戻す（新規20・復習200）
            </button>
            {saved && <span role="status" className="settings-saved">保存しました</span>}
          </div>
        </form>
      </section>

      <SyncPanel />

      <section className="panel" aria-labelledby="fsrs-title">
        <h2 id="fsrs-title">復習アルゴリズム</h2>
        <dl className="settings-info">
          <div><dt>方式</dt><dd>FSRS-6（Anki と同系統）</dd></div>
          <div><dt>評価</dt><dd>もう一度 / 難しい / 普通 / 簡単 の4段階</dd></div>
          <div><dt>学習ステップ</dt><dd>1分 → 10分（再学習は10分）</dd></div>
          <div><dt>目標保持率</dt><dd>90%</dd></div>
          <div><dt>最大間隔</dt><dd>36,500日</dd></div>
        </dl>
      </section>

      <section className="panel panel-danger" aria-labelledby="reset-title">
        <h2 id="reset-title">進捗のリセット</h2>
        <p>カードの期日・評価・日次記録をすべて削除します。元に戻せません。</p>
        <button type="button" className="btn-danger" onClick={reset}>
          進捗をすべて削除する
        </button>
      </section>
    </div>
  )
}
