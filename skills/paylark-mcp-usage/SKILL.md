---
name: paylark-mcp-usage
description: How and when to use the Paylark MCP server tools safely - reading payments, customers, subscriptions, events and webhook deliveries, and creating products, checkout links, discounts, refunds. Use when the task needs the user's real Paylark account data or actions.
---

# Using the Paylark MCP server

This plugin registers one remote MCP server, `paylark`, at `<api_base>/mcp`, authenticated with the API key the user entered when enabling the plugin. Every tool call is one `/v1` API request with that key, so it sees exactly the same data and limits as the key, and it shows up in the dashboard request log with source `MCP`.

If the tools are missing, the server is not connected: ask the user to run `/plugin` and configure `paylark` (API base URL and key), or add it by hand:
`claude mcp add --transport http paylark https://app.example.com/mcp --header "Authorization: Bearer sk_test_..."`.

## Start with `get_account`

It returns `mode` (`test` or `live`) and the balance. Say which mode you are in before doing anything else.

## Tools

| Tool | Kind | Use it for |
|---|---|---|
| `get_account` | read | Mode and balance per currency |
| `list_products` | read | Products with price, type and payment link |
| `list_payments`, `get_payment` | read | Payments, fees, tax, refunds, failure reasons |
| `list_customers` | read | Customers, exact match by email |
| `list_subscriptions` | read | Subscriptions by status or customer |
| `list_events` | read | Events exactly as sent to webhooks |
| `list_webhook_deliveries` | read | Delivery status codes and response bodies |
| `validate_license_key` | read | Check a key or a device activation |
| `search_docs` | read | Search the developer docs before writing integration code |
| `create_product` | write | One-time or recurring product |
| `create_checkout_session` | write | A hosted checkout `url` for a product |
| `create_discount` | write | Percentage or fixed discount code |
| `create_customer_portal_link` | write | One-hour self-service link for a customer |
| `create_webhook_endpoint` | write | New endpoint; returns its secret once |
| `create_refund` | destructive | Full or partial refund; cannot be undone |
| `cancel_subscription` | destructive | Cancel at period end (default) or immediately |
| `advance_test_subscription` | write, test only | Move a test subscription to its next period, optionally failing the renewal |

## Safety rules

- **Live keys are read-only by default.** Write tools return an error unless the server operator enabled live writes. Do not try to work around this; ask the user to use a test key.
- **Confirm destructive actions.** Before `create_refund` or `cancel_subscription` with `at_period_end: false`, show the payment or subscription, the amount and the effect, and wait for an explicit yes. Never refund or cancel in a loop over a list.
- **Amounts are minor units.** `1900` is US$19.00. Double-check the currency before creating products or refunds; JPY has no decimals.
- **Secrets.** `create_webhook_endpoint` returns `whsec_...` once. Write it to a git-ignored env file; never echo it in chat or commit it.
- **Customer data.** Payments and customers contain emails and names. Summarise; do not paste full lists unless asked.
