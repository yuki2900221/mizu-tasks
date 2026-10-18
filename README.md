# mizu

白いリキッドグラスUIの、モバイルファーストなメモ・タスク管理Webアプリ。

- 起動時にメモ入力欄へフォーカス。Enterで保存、Shift+Enterで改行。日本語変換中のEnterは保存しません。
- 入力中の下書きとタスクをブラウザへ保存。ログイン前でも使用可能。
- 右フリックで「未着手 → 進行中 → 完了」、左フリックで戻る。ボタンと編集シートでも変更可能。
- 検索、期限、スペース、詳細メモ、削除の取り消し、JSONエクスポート。
- 初期HTMLの全画面スケルトン、リストスケルトン、スプリングアニメーション、動きを減らすOS設定への対応。
- Cloudflare Workers API、D1同期、Google認証のみ、Workers AIによるタスク分解を実装。

## 公開状況

[公開アプリ](https://mizu-tasks-yuki.yukitodaikon.chatgpt.site) は **端末保存版**。Googleログイン・D1クラウド同期・Workers AIは、所有者のCloudflare／Google Cloudアカウントが未作成のため未接続です。未接続機能を成功したように表示しません。端末保存データはブラウザを消去すると失われるため、設定からJSONを書き出せます。

アカウント接続後は同じコードをCloudflare Workersに公開できます。[本番設定手順](docs/DEPLOYMENT.md)を参照してください。

## 開発

Node.js 22.12以上（開発時24.16）、npmを使用します。

```sh
npm ci
npm run build
npm run db:local
npm run preview
```

`http://localhost:8788` で本番ビルドとローカルWorkerを起動します。UIを編集する場合は別ターミナルで `npm run dev` を実行し `http://127.0.0.1:5180` を開きます。ViteからAPIを8788番へ転送します。AIのローカル推論は行いません。

```sh
npm run check
npm test
npm run build
npx wrangler deploy --dry-run
```

## 技術選定と理由

| 技術 | 採用理由 |
| --- | --- |
| React 19 | フリック、検索、シート、入力などの状態が連動するUIを宣言的に実装できるため。SSR必須の公開コンテンツではないのでSPAを選択。 |
| TypeScript | 画面・保存データ・Worker間でタスクの型を共有し、状態や期限の不整合を減らすため。 |
| Vite 8 | 開発時の即時更新と、小さな静的成果物を生成できるため。アプリ起動にSSRのネットワーク往復が不要。 |
| Motion | 指の移動に追従するドラッグ、レイアウト移動、シート、タブ、進捗のスプリングアニメーションを統一するため。OSの動きを減らす設定も尊重。 |
| 通常のCSS | backdrop-filter、透過、内側の光、グラデーションを細かく調整してリキッドグラスを表現するため。画面の大半を部品ライブラリの既定デザインに依存させない。 |
| Lucide React | 軽く統一された線画アイコンを利用するため。ブランドマークはローカルSVG。 |
| DM Sans / Noto Sans JP | 英数字と日本語の字面を揃えるため。Google Fontsから取得し、失敗時はシステムのsans-serifへフォールバック。 |
| localStorage | 小規模な個人メモをネットワーク待ちなしで保存・復元するため。下書きも保存。容量超過時は警告。大量データ向けのIndexedDBは将来の移行対象。 |
| Service Worker / Web App Manifest | ホーム画面への追加と、取得済みアプリのオフライン再表示のため。認証・APIレスポンスはキャッシュ対象外。 |
| Cloudflare Workers + Static Assets | APIとフロントエンドを同一オリジンで配信し、別サーバーの運用とCORS設定を減らすため。 |
| Hono | Web標準のRequest/Responseを使い、Workers上で小さいAPI・認証ミドルウェアを構成するため。 |
| Cloudflare D1 | タスク・ユーザーの関係と、ユーザー別SQL検索を扱うため。ユーザーIDとタスクIDの複合主キーで分離。 |
| Workers AI / Llama 3.3 70B Instruct FP8 Fast | ユーザー指定のCloudflare内で、日本語メモから構造化したタスク候補を生成するため。本人が確認してから追加。1ユーザー1日20回に制限。 |
| Google OpenID Connect | 指定どおりGoogleのみで認証するため。Authorization Code＋PKCE、state、nonceを利用。パスワード認証は提供しない。 |
| jose | Googleの署名付きIDトークンを公式JWKSで検証し、アプリセッションを署名するため。署名方式・発行者・対象・有効期限も検証。 |
| HttpOnly Cookie | セッショントークンをブラウザJavaScriptから読めないようにするため。本番HTTPSでSecure、SameSite=Laxを利用。変更APIではOriginも検証。 |
| Zod | 外部入力とAI応答を実行時に検証し、不正な状態・長すぎる文字列を保存しないため。 |
| Wrangler | Worker、ローカルD1、SQLマイグレーション、シークレット、デプロイをCloudflare公式CLIで扱うため。 |
| Vitest | 状態遷移、日付、認証境界、AIの失敗応答などを高速に再現するため。 |
| Prettier | TSX・CSS・設定ファイルを一貫した形で保守するため。 |
| npm + lockfile | 追加のパッケージ管理ツールを要求せず、CIと開発環境で依存関係を再現するため。 |
| GitHub Actions | push／PRごとに型検査・テスト・ビルドを実行するため。公開リポジトリでソースと検証内容を確認可能にする。 |
| Sites（暫定公開） | Cloudflareアカウント未作成でも操作できる公開URLを提供するため。所有者のCloudflareへの正式公開とは区別。Sites独自ログインはアプリに導入しない。 |

選定時に参照した一次資料: [Vite](https://vite.dev/guide/)、[Hono on Workers](https://hono.dev/docs/getting-started/cloudflare-workers)、[Static Assets](https://developers.cloudflare.com/workers/static-assets/binding/)、[D1](https://developers.cloudflare.com/d1/)、[Workers AIモデル](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/)、[Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)。

## 保存と同期

未ログイン時はゲスト用、ログイン後はGoogleのsubに対応する保存領域を利用します。初回ログイン時に端末のゲストメモを取り込みます。ログインしたユーザーのCookieをWorker側で検証し、すべてのDB読み書きにuser_id条件を適用します。

同期は更新時刻が新しいレコードを採用する方式です。削除は同期用のフラグとして保持します。オフライン時も編集でき、オンライン復帰後に同期します。同一タスクを複数端末で同時編集した場合は端末の時計に依存するため、共同編集用途には向きません。

## 構成

- `src/`: React UI、状態遷移、ローカル保存
- `worker/`: Google OAuth、署名セッション、D1同期、Workers AI API
- `migrations/`: D1スキーマ
- `public/`: アイコン、PWA、静的公開時の未接続API応答
- `tests/`: モデル・Workerの自動テスト
- `docs/`: 設定手順と検証記録

MIT License。
