import { SyncPanel } from '../components/SyncPanel'

export function Settings() {
  return (
    <div className="page settings-page">
      <h1>設定</h1>
      <p className="page-lead">端末間の同期と、復習アルゴリズムの内容を確認できます。</p>

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
    </div>
  )
}
