# Razorpay website verification checklist

This app includes the five policy pages Razorpay requires for **Business website details** review.

## Public policy URLs (no login)

Deploy to your approved domain and verify these load over HTTPS:

| Page | URL |
|------|-----|
| Terms & Conditions | `https://vithun-finance.vercel.app/terms` |
| Privacy Policy | `https://vithun-finance.vercel.app/privacy` |
| Shipping / Service Delivery | `https://vithun-finance.vercel.app/shipping` |
| Contact Us | `https://vithun-finance.vercel.app/contact` |
| Cancellation & Refunds | `https://vithun-finance.vercel.app/refunds` |
| About (recommended) | `https://vithun-finance.vercel.app/about` |

## Razorpay dashboard steps

1. **Account & Settings → Business website detail** — URL should remain `https://vithun-finance.vercel.app/` (already approved).
2. If prompted, re-run URL checks after deploy and submit the five policy paths above.
3. **Test login for reviewers** — when submitting the website, provide credentials Razorpay can use:
   - Email: `vishun.orv@gmail.com` (or a dedicated reviewer account you create)
   - Password: set a known password on that account before submission
4. **Enable Live Mode** — complete remaining KYC (PAN, bank, video KYC if required).
5. **API keys** — use test key in development; switch to live keys only after activation. Never commit `RAZORPAY_KEY_SECRET`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_RAZORPAY_KEY` | Razorpay test/live key ID |
| `RAZORPAY_KEY_SECRET` | Server-side secret (Vercel env only) |
| `NEXT_PUBLIC_LEGAL_ADDRESS` | **Required for Contact Us.** Pipe-separated: `line1\|line2\|city\|state\|pincode` |

Legal defaults are in `src/lib/legal-config.ts`. Set `NEXT_PUBLIC_LEGAL_ADDRESS` on Vercel so Contact Us matches your PAN/bank address exactly.

### Finding your address on bank statements

Parsed CSV files under `data/` do **not** include your home address — they only contain transactions and HDFC footer boilerplate (`Registered Office: HDFC Bank House, Lower Parel, Mumbai 400013`), which is the **bank’s** address, not yours.

Use the **communication / registered address** printed at the top of your original **PDF** statement (first page), or the address on your Razorpay KYC / passbook. Then set:

```bash
NEXT_PUBLIC_LEGAL_ADDRESS=Your Line 1|Your Line 2 (optional)|City|State|Pincode
```

Example shape (you fill real values):

```bash
NEXT_PUBLIC_LEGAL_ADDRESS=House/Flat, Building|Street, Locality|Waluj|Mumbai|Maharashtra|431133
```

## Business details on file

- **Legal name:** VISHNU MUNSHEELAL VISHWAKARMA
- **Email:** vishun.orv@gmail.com
- **Phone:** +91 8108940178
- **GST:** Not applicable (individual Razorpay account)

## Payment flow policy links

Settings → Profile → Payments Integration shows policy links above the Razorpay test button, satisfying checkout-adjacent disclosure requirements.

## Settlement

T+2 domestic settlement is configured in the Razorpay dashboard; no app changes required.
