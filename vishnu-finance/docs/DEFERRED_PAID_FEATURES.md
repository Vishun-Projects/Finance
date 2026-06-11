# Deferred Paid / Licensed Features

These items from the product roadmap are **intentionally deferred** until budget, scale, or regulatory requirements justify the cost.

| Feature | Why deferred | Free alternative in Vishnu Finance |
|---------|--------------|-----------------------------------|
| **Account Aggregator (Setu / Finbox)** | B2B pricing; production consent flows need partnership | Bank PDF import + manual balance |
| **SEBI Investment Adviser registration** | Regulatory deposit (₹1–10L+) and ongoing compliance | Factual data, planning, tax hints only — no stock/fund picks |
| **NSE / BSE live market data license** | Exchange licensing fees | mfdata.in + user CAS upload + delayed Finnhub (optional) |
| **Google Document AI OCR** | ~$1.50 / 1,000 pages | Tesseract + Python pdfplumber for bank PDFs |
| **Twelve Data / Polygon (paid tiers)** | Paid beyond hobby limits | mfdata.in + Finnhub free tier |
| **Novu / Knock (notification SaaS at scale)** | Free tiers too small for multi-channel at scale | Telegram + Nodemailer / Brevo SMTP |
| **Clerk / Auth0** | Paid at scale | Custom JWT + optional Better Auth OSS migration |
| **Razorpay subscriptions (live)** | Needs KYC, ops, and monetization readiness | Legal pages + env placeholders only |
| **Family multi-user dashboard** | Auth + data isolation complexity | Single-user focus until net worth v1 stabilizes |
| **Live trading / broker API** | Compliance + broker partnerships | Read-only holdings and research tools |
| **Meilisearch Cloud** | Hosted search cost | Postgres `ILIKE` for education content |
| **LangChain / heavy AI orchestration** | Unnecessary abstraction | Intent router + SQL context + Gemini free tier |
| **Dual mobile (Expo + Capacitor)** | Maintenance cost | Capacitor WebView to Vercel URL only |

## When to revisit

- **100+ active users:** Supabase Pro, Vercel Pro, Upstash upgrade, Resend for email deliverability
- **Revenue / B2B:** AA sandbox → production, paid data feeds, SEBI IA counsel
- **Copilot-heavy usage:** Monitor Gemini quota; rate-limit advisor per user (already buildable at $0)

## North star on free basis

PDF import + salary-scaled phase planning + plan adherence + intelligence — combinations most free Indian apps do not offer well together.
