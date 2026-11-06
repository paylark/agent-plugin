# Paylark 外掛（Claude Code／Cursor）

把 Paylark 收款平台接進 AI 編碼助理：一個遠端 MCP 伺服器（查詢與建立商品、結帳、訂閱、授權金鑰、Webhook 事件），加上五個技能，教助理如何在你的應用程式裡串接結帳、驗證 Webhook 簽章、管理授權金鑰與使用測試模式。

> Paylark 目前是原型，正式模式尚未串接收單機構。

## 內容

| 路徑 | 說明 |
|---|---|
| `.claude-plugin/marketplace.json` | Claude Code 外掛市集定義 |
| `.claude-plugin/plugin.json` | 外掛資訊與使用者設定（API 金鑰、API 位址） |
| `.mcp.json` | 遠端 MCP 伺服器（Streamable HTTP，`<api_base>/mcp`） |
| `.cursor-plugin/` | Cursor 外掛定義與 MCP 設定 |
| `skills/` | `paylark-integration`、`paylark-webhooks`、`paylark-license-keys`、`paylark-mcp-usage`、`paylark-testing` |

## 安裝：Claude Code

```bash
claude plugin marketplace add <owner>/<repo>
claude plugin install paylark@paylark
```

或在 Claude Code 裡執行 `/plugin marketplace add <owner>/<repo>`，再用 `/plugin install paylark@paylark`。安裝時會詢問：

- **API key**：後台「開發者 → API 金鑰」的 `sk_test_...`。金鑰存在系統鑰匙圈，不會寫進設定檔。
- **API base URL**：Paylark 伺服器位址，例如 `https://app.example.com`，本機開發用 `http://localhost:8080`。

## 安裝：Cursor

設定環境變數 `PAYLARK_API_BASE` 與 `PAYLARK_API_KEY`，再從本 repo 安裝外掛（`.cursor-plugin/plugin.json`）。

## 只用 MCP（其他用戶端）

任何支援 Streamable HTTP 的 MCP 用戶端都可直接連線：

```bash
claude mcp add --transport http paylark https://app.example.com/mcp \
  --header "Authorization: Bearer sk_test_..."
```

## 安全

- 請使用**測試金鑰**。正式金鑰只能使用唯讀工具（伺服器端另設 `MCP_ALLOW_LIVE_WRITES` 才開放寫入）。
- 不要把金鑰提交到 repo；Cursor 設定只引用環境變數。
- MCP 伺服器只接受 `ALLOWED_ORIGINS` 列出的瀏覽器來源。

## 開發

```bash
node scripts/check.mjs            # 檢查各 manifest 版本與名稱一致、技能格式正確
npx -y @anthropic-ai/claude-code plugin validate .
```

發版時同步修改 `.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`、`.cursor-plugin/plugin.json` 的 `version`。

## 授權

MIT，見 [LICENSE](LICENSE)。

---

*English: Claude Code / Cursor plugin for Paylark. Install with `claude plugin marketplace add <owner>/<repo>` then `claude plugin install paylark@paylark`. It bundles the Paylark remote MCP server and five skills. Use test keys only.*
