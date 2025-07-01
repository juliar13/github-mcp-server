# GitHub MCP Server 🐙

GitHub MCP (Model Context Protocol) サーバーは、複数の GitHub Personal Access
Token (PAT) を使用してプライベートリポジトリにアクセスできる MCP サーバーです。

## 機能 ✨

- 🔐 複数の GitHub PAT による認証とレート制限管理
- 📦 プライベートリポジトリのリリース情報取得
- 📁 リポジトリ内容の取得（ファイル・ディレクトリ）
- 📋 組織・ユーザーのリポジトリ一覧取得
- ⚡ 自動レート制限管理とトークン切り替え

## セットアップ 🚀

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

#### 方法A: MCPクライアントの環境変数で設定（推奨）

Claude Desktop の場合、`claude_desktop_config.json` で環境変数として指定：

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["/absolute/path/to/github-mcp-server/dist/index.js"],
      "env": {
        "GITHUB_TOKENS": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx,ghp_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
      }
    }
  }
}
```

### 3. ビルド

```bash
npm run build
```

## 使用方法 💡

### 開発モード

```bash
npm run dev
```

### 本番モード

```bash
npm start
```

## MCP ツール 🔧

このサーバーは以下の MCP ツールを提供します：

### `get_latest_release`

リポジトリの最新リリース情報を取得します。

**パラメータ：**

- `owner`: リポジトリオーナー名
- `repo`: リポジトリ名
- `tokens`: GitHubトークン（オプション、環境変数で設定済みの場合）

### `get_repository_content`

リポジトリのファイルまたはディレクトリ内容を取得します。

**パラメータ：**

- `owner`: リポジトリオーナー名
- `repo`: リポジトリ名
- `path`: ファイル・ディレクトリパス（オプション、デフォルト: ""）
- `ref`: Git参照（ブランチ、タグ、コミット）（オプション、デフォルト: "main"）
- `tokens`: GitHubトークン（オプション、環境変数で設定済みの場合）

### `list_repositories`

組織またはユーザーのリポジトリ一覧を取得します。

**パラメータ：**

- `owner`: 組織名またはユーザー名
- `type`: リポジトリタイプ（"all", "owner", "member"）（オプション、デフォルト:
  "all"）
- `tokens`: GitHubトークン（オプション、環境変数で設定済みの場合）

## 開発 🛠️

### コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# コード品質チェック
npm run lint              # ESLint実行
npm run lint:fix          # ESLint自動修正
npm run format            # Prettierフォーマット
npm run format:check      # フォーマットチェック
npm run type-check        # TypeScript型チェック

# セキュリティチェック
npm run security:check    # Gitleaksでシークレット検出

# Pre-commitフック
npm run pre-commit        # 全ファイルでpre-commitフック実行

# ブランチ管理
npm run check-branch       # 現在のブランチ確認
npm run create-feature-branch  # 新しいfeatureブランチ作成
```

## ブランチ管理 🌿

### フィーチャーブランチでの開発

mainブランチは保護されており、直接コミットできません。以下の手順で開発してくださ
い：

```bash
# 1. 現在のブランチ確認
npm run check-branch

# 2. フィーチャーブランチを作成
npm run create-feature-branch
# または手動で: git checkout -b feature/your-feature-name

# 3. 通常通り開発・コミット
git add .
git commit -m "Add new feature"

# 4. リモートにプッシュ
git push origin feature/your-feature-name

# 5. GitHubでPull Request作成
```

## 開発環境のセットアップ 🔧

### Pre-commitフックの設定

初回セットアップ時にpre-commitフックをインストール：

```bash
# 依存関係インストール（pre-commitも含む）
npm install

# Pre-commitフックを手動でインストール（自動的に実行されない場合）
npx pre-commit install
```

### コード品質チェック

Pre-commitフックは以下をコミット前に自動実行：

- ✅ **ブランチ保護**: mainブランチへの直接コミット防止
- ✅ **コードフォーマット**: Prettier
- ✅ **コード品質**: ESLint
- ✅ **型チェック**: TypeScript
- ✅ **セキュリティ**: Gitleaksでシークレット検出
- ✅ **ビルドチェック**: コンパイル確認
- ✅ **ファイル整合性**: 改行・空白など

## 技術スタック 📚

- **Node.js** + **TypeScript**
- **@modelcontextprotocol/sdk** - MCP プロトコル実装
- **@octokit/rest** - GitHub API クライアント
- **dotenv** - 環境変数管理
- **Pre-commit** + **Gitleaks** - セキュリティとコード品質
- **Prettier** + **ESLint** - コードフォーマットと品質

## ライセンス 📄

MIT
