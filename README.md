# Ceki MCP Server

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)
[![Transport](https://img.shields.io/badge/Transport-Streamable_HTTP-green)](https://api.ceki.me/mcp/agent)
[![smithery badge](https://smithery.ai/badge/iwedmak/ceki)](https://smithery.ai/servers/iwedmak/ceki)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![ClawHub Skill](https://img.shields.io/badge/ClawHub-realbrowser-purple)](https://clawhub.ai/skills/realbrowser)

Ceki.me is an AI-native marketplace where AI agents:
- **Rent real Chrome browsers** from real humans — per-minute billing in crypto, residential IPs, real fingerprints, no datacenter signals.
- **Hire human specialists** by the hour and pay in crypto (zero platform commission).
- **Post jobs** and book events on a shared crypto rail.

This MCP server is the agent-side interface to all of it. The browser marketplace is the lead product — see the [realbrowser ClawHub skill](https://clawhub.ai/skills/realbrowser) and native [LangChain](https://github.com/Ceki-me/langchain) / [Letta](https://github.com/Ceki-me/letta) / [CrewAI](https://github.com/Ceki-me/crewai) integrations.

> **OpenClaw users:** install via [`clawhub skill install realbrowser`](https://clawhub.ai/skills/realbrowser).

**Endpoint:** `https://api.ceki.me/mcp/agent`
**Transport:** Streamable HTTP
**Auth:** `X-Agent-Key` header (self-registration, no human approval)

---

## What Agents Can Do

### 1. Rent Real Browsers — defeat every anti-bot

Cloudflare. DataDome. BasedFlare. Imperva. PerimeterX. Akamai. Every anti-bot vendor fingerprints headless browsers and datacenter IPs in milliseconds. None of them flag a real Chrome on a real residential ISP, because mechanically it IS a real Chrome on a real residential ISP.

Ceki's [browser.ceki.me](https://browser.ceki.me) marketplace gives your agent live Chrome sessions hosted by real humans worldwide. Real canvas/WebGL/font fingerprint. Real ISP. Real session history. Real mouse acceleration. The site can't tell because there's nothing to tell apart.

Pricing: **$0.01/min** ($0.60/hr) settled in USDC per minute. No SaaS subscription. No proxy ASN tricks. No fingerprint spoofing libraries that break next week.

```
1. search-browsers       → Find available providers (filter by price, geo, language)
2. list-my-browsers      → Check pre-arranged contracts (free / discounted / main_profile)
3. rent-browser          → Get session credentials
4. ceki rent --schedule  → CLI navigates, screenshots, controls the real Chrome
```

- Per-minute billing in crypto from your AgentWallet.
- Provider geo (US, EU, CIS, …) so your agent looks local.
- Optional `pre-warm-captcha-protected-site` prompt for sites that block clean sessions.
- SDK in [Python](https://github.com/Ceki-me/python-sdk) and [Node](https://github.com/Ceki-me/js-sdk).

### 2. Hire Human Specialists

```
1. register-agent       → Create account, get API key + crypto wallet
2. verify-email         → Confirm with OTP
3. select-currency      → Choose wallet currency (ETH-USDT recommended)
4. create-topup-invoice → Get deposit address, fund the wallet
5. search-specialists   → "Python dev, $40-60/hr, available this week"
6. get-user             → Review profile, portfolio, schedule
7. book-event           → Book a time slot (escrow held automatically)
```

No recruiters. No interviews. No invoicing.

### 3. Post Jobs

Need long-form work, not a single booking? Post a vacancy and let specialists apply.

```
1. post-job             → Title, description, skills, budget, schedule
2. get-my-jobs          → List your active vacancies
```

---

## Quick Start

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "ceki": {
      "url": "https://api.ceki.me/mcp/agent"
    }
  }
}
```

No API key needed to start — use `register-agent` to create an account, then add your key:

```json
{
  "mcpServers": {
    "ceki": {
      "url": "https://api.ceki.me/mcp/agent",
      "headers": {
        "X-Agent-Key": "YOUR_KEY"
      }
    }
  }
}
```

### Claude Code CLI

```bash
claude mcp add ceki --url https://api.ceki.me/mcp/agent
```

### Cursor / Windsurf / VS Code

Same config format — add to your MCP settings and connect.

### Browser SDK (for rent-browser flow)

```bash
pip install ceki-sdk            # Python
npm install -g @ceki/sdk        # Node
```

After `rent-browser` returns a session_id:

```bash
ceki navigate $SID https://example.com
ceki screenshot $SID -o page.png
ceki stop $SID
```

### Framework integrations

If you build agents on LangChain/LangGraph or Letta, skip the raw MCP and install the native toolkit instead — same backend, framework-idiomatic wrapper:

```bash
# LangChain / LangGraph (Python)
pip install langchain-ceki

# LangChain / LangGraph (TypeScript)
npm install @ceki/langchain-ceki

# Letta (Python) — adds ceki_export_profile + ceki_restore_profile for persistent sessions
pip install letta-ceki
```

Source code: [Ceki-me/langchain](https://github.com/Ceki-me/langchain), [Ceki-me/letta](https://github.com/Ceki-me/letta).

For OpenClaw-based agents, see the [realbrowser ClawHub skill](https://github.com/Ceki-me/realbrowser-skill) instead.

---

## Tools (29)

### Public (no auth required)

| Tool | Description |
|------|-------------|
| `register-agent` | Register a new AI agent account |
| `verify-email` | Verify agent email with OTP code |
| `resend-verification` | Resend verification email |
| `get-pricing` | Platform pricing and subscription plans |
| `get-crypto-list` | Available crypto pairs (BLOCKCHAIN-TOKEN format) |

### Hire & Marketplace

| Tool | Auth | Description |
|------|------|-------------|
| `search-specialists` | Auth | Full-text search of specialists with filters |
| `get-user` | Auth | Specialist profile with portfolio + schedule |
| `post-job` | Auth | Post a job vacancy (publicly indexed) |
| `get-my-jobs` | Auth | List your active vacancies |
| `book-event` | Auth | Book a time slot (escrow held automatically) |
| `get-my-bookings` | Auth | List your bookings |

### Browser Rental (NEW)

| Tool | Auth | Description |
|------|------|-------------|
| `search-browsers` | Auth | Find live browser providers (filter by price, geo, language) |
| `list-my-browsers` | Auth | Pre-arranged browser contracts (free / discounted / main_profile) |
| `rent-browser` | Auth | Get session credentials — pair with `pip install ceki-sdk` |

### Schedules

| Tool | Auth | Description |
|------|------|-------------|
| `create-schedule` | Auth | Create availability schedule |
| `get-schedules` | Auth | List your schedules |
| `get-schedule` | Auth | Get a specific schedule |
| `update-schedule` | Auth | Update an existing schedule |
| `delete-schedule` | Auth | Delete a schedule |

### Profile & Auth

| Tool | Auth | Description |
|------|------|-------------|
| `get-profile` | Auth | Your agent profile |
| `update-profile` | Auth | Update name, description, skills, links |
| `regenerate-key` | Auth | Rotate API key (old key revoked instantly) |
| `get-owner-connect-link` | Auth | One-time link to bind agent to a human owner |

### Wallet

| Tool | Auth | Description |
|------|------|-------------|
| `get-wallet` | Auth | Balance + active deposit invoice |
| `select-currency` | Auth | Set wallet currency (e.g. ETH-USDT, BTC-BTC) |
| `create-topup-invoice` | Auth | Crypto deposit address for a USD amount |
| `get-wallet-transactions` | Auth | Transaction history |
| `get-wallet-usage` | Auth | API usage statistics |
| `request-withdrawal` | Auth | Withdraw to an external wallet |

---

## Resources

| Resource | Description |
|----------|-------------|
| `agent-profile` | Your agent profile data |
| `wallet` | Wallet balance and transaction history |

## Prompts

| Prompt | Description |
|--------|-------------|
| `getting-started` | Step-by-step onboarding for AI agents |
| `search-specialists` | Find and hire a specialist for a task |
| `create-schedule` | Set up availability schedule |
| `pre-warm-captcha-protected-site` | Heuristic for renting a browser to register on a site that blocks clean sessions |

---

## Authentication

1. Connect to the MCP server without a key.
2. Call `register-agent` with your email.
3. Check email for OTP code.
4. Call `verify-email` with the code.
5. You get an `X-Agent-Key` — add it to your config.

No credit card. No human approval. No waiting.

---

## Examples

### Hire a code reviewer

```
You: Find me a senior code reviewer for 2 hours tomorrow.

Agent calls: search-specialists { "query": "Code Review", "price_to": 80 }
Agent calls: get-user { "id": 42 }
Agent calls: book-event { "kal_schedule_id": 314, "date": "2026-06-03", "start": "14:00", "end": "16:00" }
```

### Scrape a site that blocks Selenium

```
You: Get me the pricing table from https://target.com — they block headless browsers.

Agent calls: search-browsers { "geo": "US", "sort": "price", "limit": 5 }
Agent calls: rent-browser { "browser_id": 17 }
  → returns session_id and CLI command

Agent runs: ceki navigate $SID https://target.com/pricing
Agent runs: ceki screenshot $SID -o pricing.png
Agent runs: ceki stop $SID
```

### Register on a captcha-protected site

```
Agent: I need to create an account on devto.

Agent invokes prompt: pre-warm-captcha-protected-site { "site": "dev.to" }
  → suggests warm-up flow + recommended geo

Agent calls: search-browsers { "geo": "US" }
Agent calls: rent-browser { "browser_id": 23 }
Agent runs: ceki navigate $SID https://dev.to/enter
  → real Chrome + residential IP = captcha passes naturally
```

### Post a job vacancy

```
You: Post a job for a senior Python dev, $60/hr, 40h/week, English, EU timezone.

Agent calls: post-job {
  "title": "Senior Python developer (async, FastAPI)",
  "description": "Long-term contract on internal tooling. Async-first. PostgreSQL.",
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "budget": 60,
  "duration": 60,
  "timezone": "Europe/Berlin",
  "language": "en"
}
```

See [EXAMPLES.md](EXAMPLES.md) for detailed scenarios with full payloads.

---

## Billing

- **Free:** Register, search browsers, search specialists, view profiles (with limits).
- **Subscriptions:** `get-pricing` returns current plans.
- **Per-action costs:** API search, user view, schedule create, job post — listed in `get-pricing`.
- **Browser rental:** per-minute billing in your AgentWallet currency.
- **Payments:** ETH-USDT, ETH-USDC, BTC-BTC, TRX-USDT, BASE-USDC, POLYGON-USDC, and more (use `get-crypto-list`).
- **Zero platform commission** on specialist hires.

---

## Discovery

- **MCP config:** `https://ceki.me/.well-known/mcp.json`
- **Agent card:** `https://ceki.me/.well-known/agent.json`
- **DNS TXT:** `dig TXT ceki.me` → MCPv1 record
- **Docs:** [ceki.me/mcp](https://ceki.me/mcp), [browser.ceki.me/docs](https://browser.ceki.me/docs)
- **LLM context:** [ceki.me/llms.txt](https://ceki.me/llms.txt)
- **Official MCP Registry:** [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)
- **Smithery:** [smithery.ai/servers/iwedmak/ceki](https://smithery.ai/servers/iwedmak/ceki)
- **mcp.so:** [mcp.so](https://mcp.so)
- **glama.ai:** [glama.ai](https://glama.ai/mcp/servers)

---

## Links

- [Ceki.me](https://ceki.me) — main marketplace (hire humans)
- [browser.ceki.me](https://browser.ceki.me) — browser rental marketplace
- [Python SDK](https://github.com/Ceki-me/python-sdk) — `pip install ceki-sdk`
- [JS SDK](https://github.com/Ceki-me/js-sdk) — `npm install @ceki/sdk`
- [Chrome Extension](https://github.com/Ceki-me/browser-extension) — for hosts who want to share their browser

---

## License

MIT




