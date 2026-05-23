# Pricing Strategy

## Model: Freemium + Subscription

### Free Tier (no credit card required)
- 3 guides lifetime · permanent library access
- AI tutor on existing guides · **10 msg/guide cap** (visible to user)

### Pro Tier

|  | India (INR) | International (USD) |
|---|---|---|
| **Annual** (headline) | ₹299/mo · billed ₹3,588/yr | $9/mo · billed $108/yr |
| **Monthly** | ₹399/mo | $12/mo |

**Pro includes:**
- Unlimited guides *(silent 25/month fair-use backstop — never surfaced to users)*
- AI tutor · generous fair use *(silent ~50 msg/guide backstop — never surfaced to users)*

---

## Rationale

- **₹299/₹399** straddles the psychological ₹300 barrier — annual feels like a deal, monthly is the nudge to go annual
- **$9/$12** is the well-tested range for AI tools (Notion AI $10, most copilots $10–20); 25% monthly premium is a strong pull to annual
- 3 free guides gives enough value to reach the "aha moment" without removing the upgrade trigger
- 25 guides/month is a hard ceiling only power users would hit — safe to market as unlimited

---

## Future Considerations

- **AI cost per guide** is the main variable cost. If a guide costs ~$0.10–0.30 in API calls, $9/month is very healthy at even 5 guides/month per user
- **Student discount** for India (₹149/mo with `.edu` email) — large market opportunity

---

## Lifetime Deal (LTD)

A one-time payment for permanent Pro access — no recurring charges ever.

| | India | International |
|---|---|---|
| **Lifetime** | ₹4,999 | $149 |
| Equivalent months of Pro | ~17 months | ~17 months |

Priced at ~17× the monthly rate, which is the standard breakeven benchmark.

### Why it works at launch
- Immediate cash before recurring revenue kicks in — useful for covering API and infra costs
- LTD buyers are invested in the product and promote it actively
- Product Hunt / AppSumo audiences actively hunt for LTDs, giving a burst of signups and reviews
- Zero churn risk on those users

### The risk
LTD buyers tend to be power users who generate more API cost than average. A buyer who creates 500 guides over 3 years at $0.20/guide costs more than $149.

**Mitigations:**
- Cap the lifetime plan at 10 guides/month (not unlimited)
- Offer it only during a short launch window, then retire it permanently — scarcity is the point
- Never bring it back after the window closes

### When to run it
- At public launch (Product Hunt drop)
- Limited seats (e.g. first 200 users) to create urgency and control exposure
- Running it yourself via Product Hunt keeps full margin; AppSumo has more reach but takes 25–30%
