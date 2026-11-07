# Paylark agent plugin

Paylark for AI coding agents: the Paylark MCP server plus five skills that teach your agent to add hosted checkout, subscriptions, license keys and signed webhooks to your app, and to test it all in test mode.

> Paylark is a prototype. Live mode is not yet connected to an acquirer.

## Install

| Client | Skills | MCP | How |
|---|---|---|---|
| Claude Code | ✅ | ✅ | [Marketplace](#claude-code) |
| Codex CLI | ✅ | one command | [Marketplace](#codex-cli) |
| GitHub Copilot CLI | ✅ | one command | [Marketplace](#github-copilot-cli) |
| Gemini CLI | ✅ | ✅ | [Extension](#gemini-cli) |
| Cursor | ✅ | ✅ | [Plugin](#cursor) |
| Windsurf, Cline, OpenCode, Zed, Amp, … | ✅ | config | [`npx skills` + MCP URL](#other-agents) |

The MCP server runs on your Paylark server at `<api_base>/mcp` (for example `https://app.example.com/mcp`, or `http://localhost:8080/mcp` in local development) and signs in with OAuth. There is no API key to paste: the first connection opens a Paylark consent page where you choose test or live mode and whether the agent may make changes. Connected agents are listed under Dashboard → Developers → API keys → Connected AI apps, where you can disconnect them.

Codex and Copilot CLI cannot read the server address from a setting, so their plugins install the skills and you add the MCP server with one command. Clients without OAuth can use an [API key](#api-key-fallback) instead.

### Claude Code

```sh
claude plugin marketplace add paylark/agent-plugin
claude plugin install paylark@paylark
```

Or inside Claude Code: `/plugin marketplace add paylark/agent-plugin`, then `/plugin install paylark@paylark`. Claude Code asks for the **API base URL**. Then run `/mcp`, pick `paylark` and sign in.

### Codex CLI

```sh
codex plugin marketplace add paylark/agent-plugin
codex plugin add paylark@paylark
codex mcp add paylark --url https://app.example.com/mcp
codex mcp login paylark
```

You can also run `codex`, type `/plugins` and install **Paylark** from there.

### GitHub Copilot CLI

```sh
copilot plugin marketplace add paylark/agent-plugin
copilot plugin install paylark@paylark
copilot mcp add --transport http paylark https://app.example.com/mcp
```

Copilot CLI opens the Paylark sign-in page the first time it uses the server.

### Gemini CLI

```sh
gemini extensions install https://github.com/paylark/agent-plugin
```

Gemini CLI asks for the API base URL (change it later with `gemini extensions config paylark`). Then run `/mcp auth paylark` inside Gemini CLI.

### Cursor

```sh
git clone https://github.com/paylark/agent-plugin.git ~/.cursor/plugins/local/paylark
```

Set `PAYLARK_API_BASE` in your environment and restart Cursor; Cursor asks you to sign in the first time it connects. MCP only: add `{ "mcpServers": { "paylark": { "url": "https://app.example.com/mcp" } } }` to `.cursor/mcp.json`.

### Other agents

Any agent that reads `SKILL.md` folders can take the skills with [`skills`](https://github.com/vercel-labs/skills):

```sh
npx skills add paylark/agent-plugin          # add -a <agent> for one client, -g for global
```

and any MCP client that speaks Streamable HTTP and OAuth can use the server URL:

```sh
npx add-mcp https://app.example.com/mcp
```

Clients that read the [Agent Plugins](https://agent-plugins.org) manifest (`plugin.json`) can load a clone of this repository directly for the skills.

### API key fallback

Clients without OAuth can send a Paylark secret key from Dashboard → Developers → API keys as a bearer token. Use a **test** key (`sk_test_...`); a live key only gets read-only tools.

```sh
claude mcp add --transport http paylark https://app.example.com/mcp \
  --header "Authorization: Bearer sk_test_..."
codex mcp add paylark --url https://app.example.com/mcp --bearer-token-env-var PAYLARK_API_KEY
```

```json
{ "mcpServers": { "paylark": { "type": "http", "url": "https://app.example.com/mcp",
  "headers": { "Authorization": "Bearer sk_test_..." } } } }
```

## What you get

**MCP server** `paylark`: read the account mode and balance, products, payments, customers, subscriptions, events and webhook deliveries; validate license keys; search the developer docs; create products, checkout sessions, discounts, customer portal links and webhook endpoints; refund payments and cancel subscriptions (the agent confirms first); advance test subscriptions to simulate renewals.

**Skills**

| Skill | Use it for |
|---|---|
| `paylark-integration` | Hosted checkout, payment links, one-time products and subscriptions, fulfilment |
| `paylark-webhooks` | Verifying `Paylark-Signature`, idempotent event handling, debugging deliveries |
| `paylark-license-keys` | Selling apps and CLIs with license keys and device activation |
| `paylark-mcp-usage` | When and how to call the MCP tools safely |
| `paylark-testing` | Test cards, simulated renewals and failures, local webhook testing |

Try: *"Add a Paylark checkout for my Pro plan to this app"* or *"Write a Paylark webhook handler that verifies the signature"*.

## Security

- OAuth sign-in starts in test mode and read only unless you allow changes on the consent page. Live connections only get read-only tools unless live writes are enabled for your account.
- This repository never holds a key: the bundled MCP configs carry only the server URL, and `check.mjs` fails if one adds a header.
- If you use the API key fallback, use a **test key** and never commit it.
- The MCP server only accepts browser origins listed in `ALLOWED_ORIGINS`.

## Privacy

The plugin itself collects nothing. Its skills are local files, and the MCP server it connects to is the Paylark server you configure, which handles your data under that server's privacy policy.

## Repository layout

| Path | For |
|---|---|
| `skills/` | The skills, shared by every client |
| `.claude-plugin/` | Claude Code plugin and marketplace (also read by Copilot CLI) |
| `.mcp.json` | Claude Code MCP server, using the plugin's `api_base` setting |
| `.codex-plugin/`, `.agents/plugins/` | Codex plugin and marketplace |
| `.cursor-plugin/` | Cursor plugin and MCP config |
| `gemini-extension.json` | Gemini CLI extension |
| `plugin.json` | Agent Plugins manifest |
| `assets/` | Icon |

## Development

```sh
node scripts/check.mjs                                  # every manifest agrees on name, version and MCP server
npx -y @anthropic-ai/claude-code plugin validate .
npx -y @google/gemini-cli extensions validate .
npx -y skills add . --list
```

CI runs all four. To release, bump `version` in `.claude-plugin/plugin.json` and the other manifests; `check.mjs` fails until they all match.

## License

MIT, see [LICENSE](LICENSE).

---

### 中文摘要

Paylark 的 AI 編程助手外掛：接上 Paylark MCP 伺服器（`<api_base>/mcp`，OAuth 登入，不需貼 API 金鑰；不支援 OAuth 的用戶端可改用測試金鑰），並附 5 個技能，教助手在你的專案裡串接結帳、訂閱、授權金鑰與 Webhook 簽章驗證。支援 Claude Code、Codex、Copilot CLI、Gemini CLI、Cursor，其他工具可用 `npx skills add paylark/agent-plugin` 加上 MCP 網址。
