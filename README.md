# TecAnki — 英単語

FSRS-6（Anki と同系統の間隔反復アルゴリズム）で学ぶ、日本語話者向けの英単語アプリです。
1日セッション方式で、期日が来た復習と新しい単語・表現を出題します。

## 特徴

- **12,000件**の見出し（8,800語の既存語彙 + 3,213件の追加単語・頻出表現）
- **Anki準拠の4段階評価**（もう一度 / 難しい / 普通 / 簡単）。各ボタンに次回予定を併記
- **1日セッション方式**。新規20・復習200（既定）
- 学習ステップ `1分 → 10分`、再学習 `10分`、目標保持率90% の **FSRS-6**（アルゴリズム値は固定）
- 見出し語・IPA・品詞・レベル・意味・例文+和訳・音声・**イメージ（SVG）**・コロケーション
- 例文の単語をタップすると、その語の意味をツールチップで表示
- キーボード（Space で答え表示、`1`〜`4` で評価、`R` で再生）
- 単語一覧・検索（英語 / 日本語の意味、レベル・習熟度で絞り込み）
- 統計（成熟度ドーナツ、定着率・正答率・今週の学習量・連続日数、レベル別、14日先の復習予測、直近14日の学習量、12週間の学習カレンダー、評価内訳）
- localStorage 保存 + GitHub Gist 同期（任意）
- **PWA**。アプリ・語彙データ・既存イラスト・IPAフォントをプリキャッシュして完全オフライン動作

## 技術スタック

- React 19 + TypeScript + Vite
- `ts-fsrs` 6（FSRS-6）
- `vite-plugin-pwa`（Workbox / precache）
- Vitest + Testing Library

## 開発

```sh
npm install
npm run dev        # 開発サーバー
npm test           # 単体テスト + コンテンツ検証
npm run lint       # oxlint
npm run build      # tsc -b && vite build
npm run preview    # ビルド結果の確認
```

### コンテンツ

- 既存語彙: `src/content/vocabulary/base.ts`（8,800語）
- 追加語彙・表現の種データ: `src/content/vocabulary/new/seeds/*.tsv`
- 生成ファイル: `src/content/vocabulary/new/data.ts`

種データの形式（1行1件、`|` 区切り）:

```text
word|level|pos|meaningsJa(;)|example|exampleJa|collocations(;)|ipa(省略可)
```

`npm run build:vocab` で IPA（`ipa-dict`）を補い、既存語との重複を除いてデータを再生成します。
合計が 12,000 件になるよう、単語を優先し、表現は各バッチから均等に採用します。

### イラスト

```sh
npm run build:illustrations
```

`src/content/vocabulary/new/illustrations.ts` と `public/images/vocabulary/new/*.svg` を生成します。
新規3,213件すべてに、既存イラストを流用しない**新規のフラットシーン**を描き起こします。
日本語の意味と英語のキーワードから約45のシーン(決定・休憩・旅行・料理・掃除・会議・天気など)を選び、
idのハッシュで色・位置・小物を変えて1件ずつ異なる構図にしています。
既存8,800語の対応表は `baseIllustrations.ts` です。

### PWAアイコン

```sh
npm run icons      # public/icons/*.png を生成
```

## デプロイ

`.github/workflows/deploy.yml` が `main` への push で GitHub Pages に公開します。
Vite の `base` は `GITHUB_REPOSITORY` から自動で決まります。

## 補足

- 新規に追加した単語・表現のイラストは、既存の手描きSVGを流用せず、共通プリミティブから
  新しく生成した簡易フラット画です。意味に合うシーンが見つからない抽象表現は、共通の
  「カードと矢印」のシーンになります(全体の約3分の1)。
- 設定画面の「進捗をすべて削除」で、カード・日次記録・学習日をリセットできます。
