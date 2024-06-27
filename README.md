# node-pg-replication

![データの流れ](https://storage.googleapis.com/zenn-user-upload/981ab1a15c05-20240622.png)

Node.js を仲介して擬似的なレプリケーションを可能にします。
Supabase などの PostgreSQL の DB で利用できます。

※Web サービスとしてのリードレプリカのための仕組みではありません。あくまでスクレイピングやデータ処理した結果を同期するために利用する程度に留めてください。

# 使い方

`.env.sample` を `.env` にファイル名を変更して各種記述を行ってください。

`index.ts` が実行ファイルです。

`primary` はソース DB、 `secoundary` はレプリカ DB としています。

`keepAliveServer()` は Render.com の無料プラン制約である「スピンダウン」の対策として 3 分毎に GET リクエストを飛ばしています。

```bash
npx ts-node index.ts
```

で実行開始です。

指定したチャンネルに向けて `NOTIFY` クエリが実行されると同期開始です。

## 想定する利用シーン

- スクレイピング後データ処理した結果だけを本番 DB に同期したい。
- ダッシュボードの本番 DB をデータ処理 DB に同期したい。

データ処理による本番 DB への負荷を減らす目的を主としています。データが抜け落ちる可能性も考えられますので、利用シーンはかなり限られる点にご注意ください。

## 擬似的なレプリケーションをする理由

Supabase では `superuser` 権限が与えられておらず標準のレプリケーション設定ができません。無料でレプリケーションを実行したい場合に利用すると良いでしょう。

## 推奨のホスティング先

Render.com にホスティングすると無料で済ませられます。
Webhook を使用せず、PostgreSQL の「LISTEN/NOTIFY」を利用しているため、インターネットが繋がっていればどんなマシンでも基本的に処理サーバーとして稼働できます。

指定したチャンネルに対して `NOTIFY` クエリが飛んできたら処理が開始されます。

例 :

```sql
NOTIFY hoge_channel, 'products+product_variations';
```

上記のクエリでは「products」と「product_variations」の順でレプリケーションを実行します。
`+` で繋げるだけで複数テーブルで実行されます。

# こんなデータの流れを 0 円で実現する際に使うと良いでしょう。

※Supabase の利用を想定した図

![](https://storage.googleapis.com/zenn-user-upload/3cf6365177ec-20240627.png)
