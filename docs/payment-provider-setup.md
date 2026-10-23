# ChainForge AI — Payment Provider Setup & Integration Guide (Paystack)

## 1. Overview

ChainForge AI integrates **Paystack** as its primary commercial billing and checkout gateway. Paystack provides comprehensive support for international debit/credit cards (Visa, Mastercard, Verve), bank transfers, Apple Pay, and mobile money.

---

## 2. Environment Variables & Credentials

Configure the following variables in `.env` (development) or production secret management:

```ini
# Paystack Server Secret Key (Never expose to frontend)
# Sandbox format: sk_test_... | Production format: sk_live_...
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Paystack Public Key (Exposed to Vite frontend for inline popups if needed)
# Sandbox format: pk_test_... | Production format: pk_live_...
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Base Application URL for Webhook & Return URL callbacks
VITE_APP_URL=https://app.chainforge.ai
```

> [!WARNING]
> Never commit live Paystack secret keys (`sk_live_...`) to version control. In local environments, when `PAYSTACK_SECRET_KEY` is omitted or set to a mock key, the platform automatically engages developer sandbox mode.

---

## 3. Webhook Endpoint Configuration

Paystack notifies ChainForge of completed payments and subscription lifecycle events via asynchronous HTTP webhooks.

### 3.1 Webhook URL
Configure this URL in the **Paystack Dashboard -> Settings -> API Keys & Webhooks -> Live/Test Webhook URL**:
```
https://<your-domain.com>/api/billing/webhook
```

### 3.2 Supported Events
| Event Name | Description | System Action |
| :--- | :--- | :--- |
| `charge.success` | Single payment or initial subscription charge succeeded. | Verifies HMAC-SHA512, calls `process_billing_webhook`, updates user plan, and credits monthly or top-up credit allowance. |
| `subscription.create` | Recurring subscription contract initialized. | Records Paystack `subscription_code` and `customer_code` in `public.subscriptions`. |
| `subscription.disable` | Customer canceled subscription or payment failed multiple retries. | Sets `subscriptions.status = 'canceled'` and revokes future billing cycle renewal. |
| `invoice.payment_failed` | Recurring billing invoice failed charge. | Logs billing failure alert in `payment_transactions` and flags account for retry. |

---

## 4. Webhook Security & Verification Implementation

Paystack sends a SHA-512 cryptographic hash of the raw JSON request body in the `x-paystack-signature` HTTP header. 

```typescript
// server/billingHandler.ts
export function verifyPaystackSignature(rawBody: string, signature: string, secretKey: string): boolean {
  if (!signature || !secretKey || !rawBody) return false
  try {
    const hash = createHmac("sha512", secretKey).update(rawBody).digest("hex")
    const hashBuffer = Buffer.from(hash, "utf8")
    const sigBuffer = Buffer.from(signature, "utf8")
    if (hashBuffer.length !== sigBuffer.length) return false
    return timingSafeEqual(hashBuffer, sigBuffer)
  } catch {
    return false
  }
}
```

### 4.1 Idempotency & Replay Defense
To defend against duplicate webhook deliveries (common in distributed payment gateways), the webhook processor logs every event to `public.billing_events`:

```sql
INSERT INTO public.billing_events (event_id, event_type, provider, payload, processed)
VALUES (p_event_id, p_event_type, 'paystack', p_payload, false)
ON CONFLICT (event_id) DO NOTHING;
```

If a webhook with an identical `event_id` is replayed, the RPC intercepts the conflict and responds immediately with `HTTP 200 { "status": "ignored_duplicate" }`, completely preventing duplicate fulfillment or unauthorized balance inflation.

---

## 5. Secret Key Rotation Runbook

In the event of secret compromise or scheduled key rotation:
1. Log in to the Paystack Dashboard.
2. Navigate to **Settings -> API Keys & Webhooks**.
3. Generate a new Secret Key. Paystack allows a temporary grace period where both keys remain valid.
4. Update `PAYSTACK_SECRET_KEY` in the hosting environment secrets (e.g. Supabase Secrets, Vercel, AWS Secrets Manager).
5. Trigger zero-downtime redeployment of the backend gateway.
6. Verify the rotation using `node scripts/verify-paystack-billing.mjs`.
7. Deactivate the obsolete secret key in Paystack.
