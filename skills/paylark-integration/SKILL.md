---
name: paylark-integration
description: Add Paylark payments to an app - hosted checkout, payment links, one-time products and subscriptions, success redirects and fulfilment. Use when the user wants to sell something, charge customers, add a checkout or pricing page, or start a subscription with Paylark.
---

# Integrating Paylark checkout

Paylark hosts the checkout page. Your server creates a **checkout session** with a secret key and redirects the buyer to its `url`; Paylark collects the card, tax and discount code, then redirects back and sends a signed webhook. You never handle card numbers.

## Before you write code

1. Look at the project: framework, where server routes live, how env config is loaded.
2. Get the API base URL and a **test** key (`sk_test_...`). Put them in the server env, for example `PAYLARK_API_BASE` and `PAYLARK_SECRET_KEY`, and add placeholders to `.env.example`. The secret key must never reach browser code, mobile apps or shipped binaries.
3. If the Paylark MCP tools are connected, use `list_products` to find existing products, or `create_product` (after confirming with the user). Otherwise create products in the dashboard or with `POST /v1/products`.

## API basics

- `Authorization: Bearer sk_test_...` on every `/v1` request. JSON or form bodies both work.
- Amounts are **integers in the smallest currency unit**: US$19.00 is `1900`; JPY has no decimals (¥500 is `500`). Currencies: `usd`, `eur`, `gbp`, `twd`, `jpy`.
- Send `Idempotency-Key: <your order id>` on POSTs so retries never create duplicates.
- Errors: `{"error":{"type","message","code","param"}}`. Lists: `{"data":[...],"has_more"}` with `limit` and `starting_after` for paging.

## Create a checkout session (server side)

```bash
curl "$PAYLARK_API_BASE/v1/checkout/sessions" \
  -H "Authorization: Bearer $PAYLARK_SECRET_KEY" \
  -H "Idempotency-Key: order_1234" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_...",
    "quantity": 1,
    "customer_email": "buyer@example.com",
    "success_url": "https://your.app/thanks?session={CHECKOUT_SESSION_ID}",
    "cancel_url": "https://your.app/pricing",
    "allow_discount_codes": true,
    "metadata": { "order_id": "1234", "user_id": "42" }
  }'
```

Redirect the buyer (303) to the returned `url`. `{CHECKOUT_SESSION_ID}` in `success_url` is replaced with the session ID. Sessions expire after 24 hours.

## Fulfil from the webhook, not the redirect

The success page can be skipped or forged. Grant access when you receive `checkout.session.completed` (see the `paylark-webhooks` skill) and read your own IDs from `data.object.metadata`. For subscriptions, also handle `subscription.renewed`, `subscription.past_due` and `subscription.canceled`.

On the success page you may show "processing" and poll your own database, or fetch `GET /v1/checkout/sessions/{id}` server side and check `status == "complete"`.

## Payment links (no code)

Every product has `payment_link` = `{base}/buy/{product_id}`. Append `?email=...&discount=CODE&quantity=2` to prefill. Good for emails, social posts and simple pricing pages.

## Subscriptions

Create the product with `"type": "recurring"`, `"interval": "month"` (or `week`/`year`) and optional `"trial_days"`. Checkout then creates a subscription (`status` `trialing` or `active`). Let customers manage billing with a portal link: `POST /v1/portal/sessions` with `customer_id` returns a one-hour `url`.

## Checklist before going live

- Webhook endpoint verifies signatures and is idempotent (dedupe on `event.id`).
- Test the decline path with card `4000 0000 0000 0002` (see `paylark-testing`).
- Swap to `sk_live_...` only in production env, after the merchant enabled live mode. Live webhook URLs must be HTTPS.
