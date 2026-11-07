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

The MCP server runs on your Paylark server at `<api_base>/mcp` (for example `https://app.example.com/mcp`, or `http://localhost:8080/mcp` in local development) and takes a Paylark API key as a bearer token. Use a **test** key (`sk_test_...`) from Dashboard → Developers → API keys.

Codex and Copilot CLI cannot read the server address from a setting, so their plugins install the skills and you add the MCP server with one command.

### Claude Code

```sh
claude plugin marketplace add paylark/agent-plugin
claude plugin install paylark@paylark
```

Or inside Claude Code: `/plugin marketplace add paylark/agent-plugin`, then `/plugin install paylark@paylark`. Claude Code asks for the **API base URL** and the **API key**; the key is stored in the system keychain, not in a settings file.

### Codex CLI

```sh
codex plugin marketplace add paylark/agent-plugin
codex plugin add paylark@paylark
codex mcp add paylark --url https://app.example.com/mcp --bearer-token-env-var PAYLARK_API_KEY
```

Then export `PAYLARK_API_KEY=sk_test_...` before starting `codex`. You can also run `codex`, type `/plugins` and install **Paylark** from there.

### GitHub Copilot CLI

```sh
copilot plugin marketplace add paylark/agent-plugin
copilot plugin install paylark@paylark
copilot mcp add --transport http paylark https://app.example.com/mcp \
  --header "Authorization: Bearer $PAYLARK_API_KEY"
```

`copilot mcp add` saves the header in `~/.copilot/mcp-config.json`, so use a test key.

### Gemini CLI

```sh
gemini extensions install https://github.com/paylark/agent-plugin
```

Gemini CLI asks for the API base URL and the API key (kept in the system keychain). Change them later with `gemini extensions config paylark`.

### Cursor

```sh
git clone https://github.com/paylark/agent-plugin.git ~/.cursor/plugins/local/paylark
```

Set `PAYLARK_API_BASE` and `PAYLARK_API_KEY` in your environment and restart Cursor. The plugin's MCP config (`.cursor-plugin/mcp.json`) only references those variables.

### Other agents

Any agent that reads `SKILL.md` folders can take the skills with [`skills`](https://github.com/vercel-labs/skills):

```sh
npx skills add paylark/agent-plugin          # add -a <agent> for one client, -g for global
```

and any MCP client that speaks Streamable HTTP can use the server:

```json
{
  "mcpServers": {
    "paylark": {
      "type": "http",
      "url": "https://app.example.com/mcp",
      "headers": { "Authorization": "Bearer sk_test_..." }
    }
  }
}
```

Clients that read the [Agent Plugins](https://agent-plugins.org) manifest (`plugin.json`) can load a clone of this repository directly for the skills.

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

- Use **test keys**. Live keys only get read-only tools unless the server sets `MCP_ALLOW_LIVE_WRITES`.
- Never commit a key. The Cursor and Gemini configs only reference environment variables.
- The MCP server only accepts browser origins listed in `ALLOWED_ORIGINS`.

## Privacy

The plugin itself collects nothing. Its skills are local files, and the MCP server it connects to is the Paylark server you configure, which handles your data under that server's privacy policy.

## Repository layout

| Path | For |
|---|---|
| `skills/` | The skills, shared by every client |
| `.claude-plugin/` | Claude Code plugin and marketplace (also read by Copilot CLI) |
| `.mcp.json` | Claude Code MCP server, using the plugin's `api_base` and `api_key` settings |
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

Paylark 的 AI 編程助手外掛：接上 Paylark MCP 伺服器（`<api_base>/mcp`，用測試 API 金鑰），並附 5 個技能，教助手在你的專案裡串接結帳、訂閱、授權金鑰與 Webhook 簽章驗證。支援 Claude Code、Codex、Copilot CLI、Gemini CLI、Cursor，其他工具可用 `npx skills add paylark/agent-plugin` 加上 MCP 網址。
