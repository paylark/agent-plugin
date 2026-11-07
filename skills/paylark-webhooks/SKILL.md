---
name: paylark-webhooks
description: Receive and verify Paylark webhooks (Paylark-Signature HMAC header), handle checkout, payment, subscription and license events idempotently, and debug failed deliveries. Use when writing a webhook handler for Paylark or when events are not arriving.
---

# Paylark webhooks

Paylark POSTs each event as JSON to your endpoint:

```json
{ "id": "evt_...", "object": "event", "type": "checkout.session.completed", "livemode": false, "created": 1767225600,
  "data": { "object": { "id": "cs_...", "object": "checkout_session", "metadata": { "order_id": "1234" } } } }
```

## Verify the signature

Header: `Paylark-Signature: t=<unix seconds>,v1=<hex>` where `v1 = HMAC-SHA256(endpoint_secret, "<t>.<raw body>")`. While a secret rotation's grace period lasts the header has **two** `v1` values (new secret first, previous second); accept the event if **any** `v1` matches.

1. Read the **raw** request body before any JSON parsing (body parsers change whitespace and break the signature).
2. Split the header on `,` then `=`; take `t` and **every** `v1` (never parse it into a map: a later `v1` would overwrite the first).
3. Compute the HMAC over `t + "." + rawBody` with the endpoint secret (`whsec_...`, stored in server env, e.g. `PAYLARK_WEBHOOK_SECRET`).
4. Compare in constant time, and reject if `|now - t| > 300` seconds.
5. Respond `2xx` quickly; do slow work in a background job.

### Go

```go
func verify(secret string, body []byte, header string) bool {
	var ts string
	var sigs []string
	for _, p := range strings.Split(header, ",") {
		k, v, _ := strings.Cut(p, "=")
		switch k {
		case "t":
			ts = v
		case "v1":
			sigs = append(sigs, v)
		}
	}
	t, err := strconv.ParseInt(ts, 10, 64)
	if err != nil || len(sigs) == 0 || math.Abs(float64(time.Now().Unix()-t)) > 300 {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	fmt.Fprintf(mac, "%d.%s", t, body)
	want := []byte(hex.EncodeToString(mac.Sum(nil)))
	ok := false
	for _, sig := range sigs {
		ok = hmac.Equal(want, []byte(sig)) || ok
	}
	return ok
}
```

### Node.js (Express)

```js
app.post('/webhooks/paylark', express.raw({ type: 'application/json' }), (req, res) => {
  const pairs = (req.get('Paylark-Signature') || '').split(',').map((p) => p.split('='));
  const t = (pairs.find(([k]) => k === 't') || [])[1];
  const sigs = pairs.filter(([k]) => k === 'v1').map(([, v]) => v);
  const body = req.body.toString('utf8');
  const expected = crypto.createHmac('sha256', process.env.PAYLARK_WEBHOOK_SECRET).update(`${t}.${body}`).digest('hex');
  const ok = sigs.some((v1) => v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected)));
  if (!ok || Math.abs(Date.now() / 1000 - Number(t)) > 300) return res.status(400).end();
  const event = JSON.parse(body);
  // enqueue(event) and return fast
  res.sendStatus(200);
});
```

### Python

```python
pairs = [p.split("=", 1) for p in request.headers.get("Paylark-Signature", "").split(",") if "=" in p]
t = next((v for k, v in pairs if k == "t"), "0")
expected = hmac.new(secret.encode(), f"{t}.{raw_body}".encode(), hashlib.sha256).hexdigest()
valid = any(hmac.compare_digest(expected, v) for k, v in pairs if k == "v1") and abs(time.time() - int(t)) <= 300
```

## Handle events idempotently

Deliveries can repeat (retries, manual resends). Store processed `event.id`s and skip duplicates. Useful types:

| Event | Typical action |
|---|---|
| `checkout.session.completed` | Fulfil the order / grant access (read `metadata`) |
| `payment.succeeded` / `payment.failed` | Receipts, dunning emails |
| `refund.created` | Revoke access if fully refunded |
| `subscription.created` / `subscription.renewed` | Extend access to `current_period_end` |
| `subscription.past_due` | Warn the customer, keep a grace period |
| `subscription.canceled` | Remove access |
| `license_key.created` / `license_key.revoked` | Sync licenses |
| `dispute.created` | Alert the merchant |

Create the endpoint with `POST /v1/webhook_endpoints` (`url`, optional `enabled_events`, default all). The response holds the `secret` once.

Rotate without downtime with `POST /v1/webhook_endpoints/{id}` and `rotate_secret: true`: the previous secret keeps signing deliveries for `previous_secret_expires_in` seconds (default 86400, `0` = stop now, max 604800; see `previous_secret_expires_at`). Update every server to the new secret, then end the grace period early with `expire_previous_secret: true`.

## Retries and debugging

Non-2xx, timeouts (10 s) and connection errors are retried after 1m, 5m, 30m, 2h, 6h, 12h and 24h (8 attempts, about 3 days). Live endpoints must be HTTPS and public; test mode allows `http://localhost` only when the server runs with private delivery enabled, otherwise use a tunnel (ngrok, cloudflared).

With the MCP tools: `list_webhook_deliveries` (filter `status=failed` or by `event_id`) shows the last HTTP status and response body; `list_events` shows what was emitted. `POST /v1/webhook_endpoints/{id}/test` sends a `ping` event, and `POST /v1/webhook_deliveries/{id}/retry` resends one delivery.
