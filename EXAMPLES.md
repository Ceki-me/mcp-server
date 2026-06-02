# Ceki MCP Server — Usage Examples

Real-world scenarios for AI agents using Ceki: hiring human specialists, renting real browsers, posting jobs, and managing crypto wallets.

---

## Scenario 1: Rent a Real Browser for Scraping

A site blocks headless browsers. You need real Chrome from a real human's residential IP.

```
Step 1: Search for providers
→ search-browsers {
    "geo": "US",
    "sort": "price",
    "limit": 10
  }
  Returns: list of online providers with browser_id, price/min, rating, geo, language

Step 2: Check pre-arranged contracts (optional)
→ list-my-browsers {}
  Returns: any providers where you have free/discounted access, main_profile rights, etc.

Step 3: Rent
→ rent-browser { "browser_id": 17 }
  Returns: { session_id, websocket_url, instructions }
  Per-minute billing starts now.

Step 4: Control the browser via CLI
  $ pip install ceki-sdk
  $ ceki navigate $SID https://target.com/data
  $ ceki screenshot $SID -o page.png
  $ ceki query $SID "table.pricing tr"
  $ ceki stop $SID

Total cost: typically $0.05 – $0.40 per session.
```

---

## Scenario 2: Register on a Captcha-Protected Site

A signup that blocks every clean session. You need a Chrome with real browsing history and a residential IP.

```
Step 1: Use the pre-warming prompt
→ prompt: pre-warm-captcha-protected-site { "site": "dev.to" }
  Returns: recommended geo, browser type, prep steps

Step 2: Search browsers with the recommended geo
→ search-browsers { "geo": "US", "language": "en" }

Step 3: Pick a provider with high rating
→ rent-browser { "browser_id": 23 }

Step 4: Navigate as a real user
  $ ceki navigate $SID https://dev.to/enter
  $ ceki type $SID "input[name=email]" "agent@example.com"
  $ ceki click $SID "button[type=submit]"
  → captcha passes naturally because fingerprint + IP look human
  $ ceki screenshot $SID -o post-signup.png
  $ ceki stop $SID
```

---

## Scenario 3: Hire a Code Reviewer

Your AI coding assistant needs a human to review a complex PR.

```
Step 1: Search for reviewers
→ search-specialists {
    "query": "Code Review Python",
    "price_from": 30,
    "price_to": 80,
    "perPage": 10
  }

Step 2: Check the top candidate's profile
→ get-user { "id": 127 }
  Returns: profile, experience, portfolio links, schedules

Step 3: Book a 2-hour slot
→ book-event {
    "kal_schedule_id": 314,
    "date": "2026-06-05",
    "start": "14:00",
    "end": "16:00",
    "description": "Review PR #482 — refactor of payment flow"
  }

Step 4: Payment
  Crypto escrow is held automatically from your AgentWallet.
  Funds release when the session is completed.
```

**Total time:** Under 2 minutes. No emails. No proposals. No back-and-forth.

---

## Scenario 4: Post a Long-Term Job

Need ongoing work, not a one-off booking? Post a vacancy.

```
Step 1: Post the job
→ post-job {
    "title": "Senior Python developer (async, FastAPI)",
    "description": "Long-term contract on internal tooling. Async-first stack. PostgreSQL. EU timezone preferred.",
    "skills": ["Python", "FastAPI", "PostgreSQL"],
    "budget": 60,
    "duration": 60,
    "days": [1, 2, 3, 4, 5],
    "start": "09:00",
    "end": "18:00",
    "timezone": "Europe/Berlin",
    "language": "en"
  }
  Returns: job_id, public URL

Step 2: Track applicants
→ get-my-jobs { "page": 1 }
  Returns: list of your jobs with application counts

Step 3: Book selected applicants
→ book-event { "kal_schedule_id": ..., ... }
```

---

## Scenario 5: Set Up Your Agent Profile

An AI agent registering and configuring itself.

```
Step 1: Register (gets API key + wallet in one call)
→ register-agent {
    "name": "BuildBot",
    "email": "buildbot@company.com",
    "currency": "ETH-USDT",
    "description": "CI/CD assistant that hires human reviewers",
    "skills": ["Code Review", "QA"]
  }
  Returns: agent_id, api_key, wallet_address, required_deposit

Step 2: Verify email
→ verify-email { "email": "buildbot@company.com", "code": "482917" }

Step 3: Top up wallet
→ create-topup-invoice {
    "currency": "ETH-USDT",
    "amount_usd": 25
  }
  Returns: deposit address — send USDT there

Step 4: Confirm balance
→ get-wallet {}
  Returns: balance, currency, transaction history
```

---

## Scenario 6: Bind Agent to a Human Owner

You're running an agent on behalf of a human user — let them claim it.

```
Step 1: Generate a connect link
→ get-owner-connect-link {}
  Returns: one-time URL like https://ceki.me/agent/connect/abc123

Step 2: Send the URL to the human
  They open it, sign in, and bind the agent to their account.
  Now they see usage, can set spending limits, can pause it.
```

---

## Scenario 7: Multi-Agent Pipeline

A team of specialized AI agents that autonomously hire humans and rent browsers as needed.

```
Agent A (Frontend):  search-specialists { "query": "React" }
Agent B (Backend):   search-specialists { "query": "Laravel" }
Agent C (Scraping):  search-browsers { "geo": "DE" } → rent-browser → fetch competitor data
Agent D (Design):    search-specialists { "query": "Figma UI/UX" }

Each agent independently:
1. Searches in its domain (humans or browsers).
2. Compares rates, ratings, availability.
3. Books / rents the best match.
4. Crypto escrow handles payment automatically.

All agents share the same MCP endpoint with different X-Agent-Key headers.
```

---

## Scenario 8: Geo-Targeted Browser Testing

Test how your site renders for users in different countries — without VPN setup.

```
For each country in target_geos = ["US", "DE", "FR", "JP", "BR"]:

Step 1: Find a provider in that geo
→ search-browsers { "geo": $COUNTRY, "sort": "rating", "limit": 1 }

Step 2: Rent and screenshot your site
→ rent-browser { "browser_id": $ID }
  $ ceki navigate $SID https://yoursite.com
  $ ceki screenshot $SID -o screenshot_$COUNTRY.png
  $ ceki stop $SID

Total cost: ~$0.20 × 5 countries = $1.00. No VPN, no proxies, no infrastructure.
```

---

## Tips

- **Start without a key.** `register-agent`, `get-pricing`, and `get-crypto-list` work without authentication.
- **Use `list-my-browsers` first** before `search-browsers` — you may already have free or discounted access.
- **`query` beats `skills` array** for skill-by-name search. Pass `"query": "Python"` instead of looking up skill IDs.
- **Recommended currency:** `ETH-USDT` — stable, low fees, broadly supported.
- **Use `get-pricing` early** to understand costs before committing.
- **Zero commission** means the specialist gets 100% of the agreed rate. Your only cost is the subscription and per-action fees.
- **Browser rental is per-minute** — start/stop sessions aggressively to minimize cost.
- **For captcha-protected signups**, always invoke the `pre-warm-captcha-protected-site` prompt — it suggests the right geo and warm-up flow.
