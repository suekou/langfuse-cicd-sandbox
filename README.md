# langfuse-cicd

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数

`.env.example` を `.env` にコピーして埋める。

```bash
cp .env.example .env
```

| 変数                  | 用途                                                              |
| --------------------- | ----------------------------------------------------------------- |
| `LANGFUSE_PUBLIC_KEY` | Langfuse Settings → API Keys                                      |
| `LANGFUSE_SECRET_KEY` | 同上                                                              |
| `LANGFUSE_BASE_URL`   | `https://jp.cloud.langfuse.com`                                   |
| `ANTHROPIC_API_KEY`   | [Anthropic Console](https://console.anthropic.com/) の API Keys   |

### 3. Langfuse に dataset を作成

```bash
pnpm seed
```

`country-from-image-dataset` という dataset と 3 件の item が登録される。

### 4. GitHub Actions の Secrets を登録

リポジトリの **Settings → Secrets and variables → Actions** に以下を登録。

- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`
- `ANTHROPIC_API_KEY`

### 5. action タグをピン留め

`.github/workflows/langfuse-experiment.yml` の `langfuse/experiment-action@v1` を [最新リリースのタグ](https://github.com/langfuse/experiment-action/releases) に置き換える。

### 6. PR を作って動作確認

`experiments/` `scripts/` `prompts/` `assets/` などを変更した PR を作ると、`langfuse-experiment.yml` が起動して experiment gate が走る。`main` にマージされると `langfuse-prompt-promote.yml` が `prompts/country-classifier.md` を Langfuse へ `latest` ラベルで反映する。
