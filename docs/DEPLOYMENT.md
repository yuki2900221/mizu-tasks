# Cloudflare本番公開

正式URL: https://mizu-tasks.mizu-tasks.workers.dev

2026-10-18にCloudflare Workers・D1・Workers AIを設定し、Google認証を接続しました。認証情報はWorkerの非公開シークレットに保存しています。GitHub、フロントエンド、チャットに秘密値は含めていません。

## 現在のリソース

- Worker: `mizu-tasks`
- D1: `mizu-tasks-db`（APAC、スキーマ適用済み）
- AI binding: `AI`
- Secret: `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET`
- Googleクライアント: Webアプリケーション `mizu Web`
- リダイレクトURI: `https://mizu-tasks.mizu-tasks.workers.dev/auth/google/callback`
- Google権限: `openid email profile` のみ
- プライバシー: `https://mizu-tasks.mizu-tasks.workers.dev/privacy`

Google Auth PlatformのAudienceは **本番環境（外部）** に切り替え済みです。公開後にログアウト→Googleアカウント選択→本番コールバック→ログイン成功を確認しました。要求権限は引き続き基本IDスコープのみです。[Google公式の公開状態の説明](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview?hl=en)。ブランド名・ロゴの確認申請は別手続きで、現在のGoogle同意画面にはドメイン名が表示されます。

## 再デプロイ

```sh
npm ci
npm test
npm run deploy
```

DB変更がある場合は、SQLを `migrations/` に追加してから適用します。

```sh
npm run db:remote
```

GitHub Actionsはpush／PR時の型検査・自動テスト・ビルド用です。Cloudflareへの再デプロイは上のWranglerコマンドで行います。

## 別アカウントで再構築する場合

Cloudflare公式CLIで、必要な範囲だけを認可します。現在の接続はOSキーチェーンで保護しています。

```sh
npx wrangler login --device --use-keyring --scopes account:read user:read workers_scripts:write d1:write ai:write offline_access
npx wrangler d1 create mizu-tasks-db
```

返されたdatabase_idを `wrangler.jsonc` に設定し、マイグレーションとデプロイを行います。Google CloudではGoogle Auth Platformのブランディング・対象・Webクライアントを作り、新しい公開URLの `/auth/google/callback` を登録します。ホームページと `/privacy` も設定してください。Googleに表示するブランド名・ロゴの検証が必要な場合は、所有するドメインとGoogleの検証手続きが必要です。

秘密値は次の対話入力で登録します。引数・シェル履歴・ソースに書き込まないでください。

```sh
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

SESSION_SECRETは32文字以上の十分ランダムな値を使います。現在の本番値は専用に安全な乱数で生成しており、ローカル試験値は使っていません。

ローカル認証を検証する場合は、別の開発用Googleプロジェクトを使い、`.env.example` と同じキーを未追跡の `.dev.vars` に設定します。開発用クライアントに `http://localhost:8788/auth/google/callback` を登録し、localhostと127.0.0.1を混在させないでください。

## 認証・同期・AI

GoogleのIDトークンは署名・発行者・audience・nonce・email_verifiedを検証します。OAuth中間Cookieは10分、アプリセッションは7日。CookieはHttpOnly、HTTPSではSecure、SameSite=Laxです。変更APIはOriginも検証します。端末内に残るアカウント表示キャッシュをサーバーの認証には使いません。

タスクのDB操作にはセッション由来のuser_idを必ず指定します。オフライン編集・再読み込みができ、復帰時にセッションを確認して同期します。同一タスクを複数端末で同時編集した場合は、端末時刻による最新更新を採用します。共同編集向けではありません。

Workers AIのモデルは `@cf/meta/llama-3.3-70b-instruct-fp8-fast`。日本語の実推論を本番で確認済みです。実行時だけ入力メモを送信し、候補を確認してから追加します。アプリ側ではユーザーごとにUTC日付基準20回／日に制限しています。Cloudflareの利用枠はアカウント全体にも適用されます。今回、カード登録・有料プランへの変更は行っていません。

## 検証結果と範囲

Googleログイン→Cookie→D1保存→オフライン復帰同期→本物のAI推論→ログアウト・再ログインまで合格。[検証記録](TESTING.md)に手順と実行範囲を記載しています。複数の物理端末と実機iOS／Androidでの操作は未実施です。
