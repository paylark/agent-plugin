---
name: paylark-testing
description: Test an Paylark integration end to end in test mode - test card numbers for success, declines and disputes, simulating subscription renewals and failures, and testing webhooks locally. Use when writing tests or manually checking checkout, renewal and refund flows.
---

# Testing with Paylark

Test mode (`sk_test_...`) is fully separate from live mode: different keys, data and webhooks, and no real charges. Only the cards below are accepted in test mode; any other number returns `test_card_required`.

## Test cards

Use any future expiry (e.g. `12/34`) and any 3-digit CVC.

| Number | Result |
|---|---|
| `4242 4242 4242 4242` | Succeeds (Visa) |
| `5555 5555 5555 4444` | Succeeds (Mastercard) |
| `3566 0020 2036 0505` | Succeeds (JCB) |
| `4000 0000 0000 0259` | Succeeds, then a `dispute.created` event |
| `4000 0000 0000 0002` | Declined: `card_declined` |
| `4000 0000 0000 9995` | Declined: `insufficient_funds` |
| `4000 0000 0000 0069` | Declined: `expired_card` |
| `4000 0000 0000 0127` | Declined: `incorrect_cvc` |

A declined attempt creates a `failed` payment and a `payment.failed` event; the checkout stays open so the buyer can retry.

## Scenarios worth covering

1. **Happy path**: checkout with 4242, receive `checkout.session.completed`, fulfil once.
2. **Decline then success** on the same session: only one fulfilment.
3. **Duplicate webhook**: resend the same delivery (`POST /v1/webhook_deliveries/{id}/retry`); your handler must be idempotent.
4. **Refund**: partial, then full (`POST /v1/refunds`); access and license keys are revoked on full refund.
5. **Subscription renewal**: `POST /v1/test_helpers/subscriptions/{id}/advance` moves to the next period and charges (`subscription.renewed`); with `{"fail": true}` the renewal fails and the subscription becomes `past_due`.
6. **Cancel at period end and resume** via the customer portal link.
7. **Discount codes**: percentage and fixed, max redemptions reached.

## Webhooks on your machine

Expose your local server with a tunnel (ngrok, cloudflared) and register that HTTPS URL as a test-mode endpoint. If you run Paylark locally in development mode, `http://localhost` endpoints work directly.

## Automating checkout in tests

The hosted checkout page calls `POST {base}/public/checkout/{session_id}/pay` with `{ email, country, card: { number, exp, cvc } }`. In integration tests you can call it directly with a test card instead of driving a browser. It only accepts test cards in test mode.
