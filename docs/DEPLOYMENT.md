# Cloudflare本番公開

現在、CloudflareとGoogle Cloudのアカウントは未作成です。以下を完了するまではGoogle認証・クラウド同期・Workers AIの実動作は未検証です。公開中のSites版は端末保存版です。

## 1. アカウントとD1

Cloudflareアカウントを作成して、ログインします。アカウント作成時の利用規約同意や認証入力は所有者が行います。

```sh
npm ci
npx wrangler login
npx wrangler d1 create mizu-tasks-db
```

返されたdatabase_idを `wrangler.jsonc` のプレースホルダーに設定します。アカウントIDや秘密鍵をリポジトリに含める必要はありません。

```sh
npm run db:remote
npm run deploy
```

初回公開時はGoogle認証は無効です。返されたHTTPSオリジンを次の設定に使います。

## 2. Google OAuth

Google Cloudプロジェクトを作成し、Google Auth Platformのブランディング、対象（Audience）、クライアントを設定します。

- クライアントの種類: ウェブアプリケーション
- スコープ: openid、email、profileのみ
- 承認済みリダイレクトURI: `https://<Workerのホスト名>/auth/google/callback`
- テスト中は必要なGoogleアカウントをテストユーザーとして追加
- 一般公開する場合は対象を本番公開へ変更し、Googleが要求する同意画面等の設定を完了

ログイン用途だけなので、Google DriveやGmailの権限は要求しません。

取得した値を対話入力し、シェルの履歴やソースに秘密を残さないでください。

```sh
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

SESSION_SECRETはパスワード管理ツール等で生成した、32文字以上の十分ランダムな値を使用します。リポジトリにあるテスト値は本番に使用しません。

Googleのトークンは署名・発行者・audience・nonce・email_verifiedを検証します。OAuthの中間Cookieは10分、アプリセッションは7日です。

ローカル検証時は `.env.example` と同じキーを未追跡の `.dev.vars` に設定し、Googleに `http://localhost:8788/auth/google/callback` も登録してください。localhostと127.0.0.1の混在は避けます。

## 3. Workers AI

`wrangler.jsonc` の `ai.binding = AI` を使用します。モデルは `@cf/meta/llama-3.3-70b-instruct-fp8-fast`。利用可能枠や課金条件は所有者のCloudflareアカウントで確認してください。AIは実行ボタンを押したときだけメモを送信し、結果を確認後に追加します。アプリ側でユーザーごとにUTC日付基準20回までに制限しています。

## 4. 本番で残っている受け入れ試験

1. Googleでログイン → Cookie発行 → 名前表示 → ログアウト。
2. 同じGoogleアカウントで別の端末から入り、D1のメモが復元される。
3. 別のGoogleアカウントから他人のメモが見えない。
4. オフライン編集 → 復帰 → クラウド同期。
5. Workers AIで日本語メモを分解 → 候補を確認 → 追加。
6. Googleでの認可拒否、セッション期限切れ、AI通信失敗を確認。
7. 本物のiOS Safari・Android Chromeでキーボードとタッチフリックを確認。

この試験に合格するまでは「本番機能の全テスト合格」と扱いません。
