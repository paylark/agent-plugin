---
name: paylark-license-keys
description: Sell desktop apps, plugins or CLI tools with Paylark license keys - automatic key issuance after payment, activation limits, and activate, validate and deactivate calls from your own server. Use when the user needs software licensing or device activation with Paylark.
---

# Paylark license keys

Turn on `license_key: true` (and `license_activation_limit`, default 1) on a product. Every successful payment then issues a key like `ABCDE-FGHJK-MNPQR-STUVW`, shown on the checkout success page, in the customer portal and in the `license_key.created` webhook. A full refund revokes the key automatically.

## Never ship the secret key

The activation API needs the secret key, so the app must not call Paylark directly. Add a small endpoint on **your** server that the app calls, and have that server call Paylark:

```text
desktop app ──POST /license/activate {key, device_name}──▶ your server ──POST /v1/license_keys/activate──▶ Paylark
```

## Calls (from your server)

| Call | Body | Result |
|---|---|---|
| `POST /v1/license_keys/activate` | `key`, `instance_name` | `{ license_key, instance: { id, name } }`; error when the key is revoked or the limit is reached |
| `POST /v1/license_keys/validate` | `key`, optional `instance_id` | `{ valid, license_key, ... }` |
| `POST /v1/license_keys/deactivate` | `key`, `instance_id` | frees a seat, e.g. when the user moves to a new computer |
| `POST /v1/license_keys/{id}/revoke` | – | permanently disables the key |

Keys are matched case-insensitively, so normalise user input with `trim()` but do not reject lower case.

## Client behaviour

1. On first run, ask for the key, call your activate endpoint, and store `instance.id` with the key (OS keychain if available).
2. On start, call validate with `instance_id`. Cache a successful result and allow an offline grace period (for example 7 days) so the app keeps working without network.
3. Offer "deactivate this device" in settings; call deactivate before uninstalling.
4. Treat `valid: false` as "show the license screen", not as a crash.

With the MCP tools you can check a key with `validate_license_key` while debugging.
