# Ceki MCP Server

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)
[![Transport](https://img.shields.io/badge/Transport-Streamable_HTTP-green)](https://api.ceki.me/mcp/agent)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

Ceki.me is an AI-native marketplace where you hire specialists by the hour and pay in crypto. This MCP server lets AI agents search specialists, manage schedules, and handle payments — all through the [Model Context Protocol](https://modelcontextprotocol.io/).

**Endpoint:** `https://api.ceki.me/mcp/agent`
**Transport:** Streamable HTTP
**Auth:** `X-Agent-Key` header (self-registration, no human approval needed)

## How to Hire a Specialist

This is what the MCP server is for. Here's the complete flow:

```
1. register-agent     → Create account, get API key + crypto wallet
2. verify-email       → Confirm your email with OTP code
3. select-currency    → Choose wallet currency (USDT recommended)
4. get-wallet         → Get deposit address, fund your wallet
5. search-specialists → Find "React developer, $40-60/hr, available this week"
6. get-user           → Review profile, portfolio, schedule
7. create-schedule    → Book a time slot
8. Payment is handled automatically via crypto escrow
```

No recruiters. No interviews. No invoicing. Your AI agent does it all.

## Quick Start

### Claude Desktop / Claude Code

Add to your MCP config:

```json
{
  "mcpServers": {
    "ceki": {
      "url": "https://api.ceki.me/mcp/agent"
    }
  }
}
```

No API key needed to start — use the `register-agent` tool to create an account, then add your key:

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

Same config format. Add to your MCP settings and connect.

## Tools (19)

### Public (no auth required)

| Tool | Description |
|------|-------------|
| `register-agent` | Register a new AI agent account |
| `verify-email` | Verify agent email with OTP code |
| `resend-verification` | Resend verification email |
| `get-pricing` | Get platform pricing and subscription plans |
| `search-specialists` | Search available specialists by skills, rate, availability |
| `get-user` | Get specialist profile details |

### Authenticated (requires X-Agent-Key)

| Tool | Description |
|------|-------------|
| `get-profile` | Get your agent profile |
| `update-profile` | Update agent profile details |
| `regenerate-key` | Generate a new API key |
| `create-schedule` | Create availability schedule for bookings |
| `get-schedules` | List your schedules |
| `get-schedule` | Get a specific schedule |
| `update-schedule` | Update an existing schedule |
| `delete-schedule` | Delete a schedule |
| `get-wallet` | Get wallet balance and deposit address |
| `select-currency` | Select preferred crypto currency (BTC, ETH, USDT, USDC) |
| `get-wallet-transactions` | View transaction history |
| `get-wallet-usage` | Get wallet usage statistics |
| `request-withdrawal` | Request crypto withdrawal from wallet |

## Resources

| Resource | Description |
|----------|-------------|
| `agent-profile` | Your agent profile data |
| `wallet` | Wallet balance and transaction history |

## Prompts

| Prompt | Description |
|--------|-------------|
| `getting-started` | Step-by-step guide to start using Ceki as an AI agent |
| `search-specialists` | Find and hire a specialist for a task |
| `create-schedule` | Set up availability schedule |

## Authentication

1. Connect to the MCP server without a key
2. Call `register-agent` with your email
3. Check email for OTP code
4. Call `verify-email` with the code
5. You get an `X-Agent-Key` — add it to your config

No credit card, no human approval, no waiting.

## Examples

### Find a React developer

```
You: Find me a React developer available this week, $40-60/hr range

Agent calls: search-specialists {
  "skills": ["React"],
  "min_rate": 40,
  "max_rate": 60,
  "available": true
}

→ Returns matching specialists with profiles, rates, and availability
```

### Book a code review session

```
You: I need a senior code reviewer for 2 hours tomorrow

Agent calls: search-specialists { "skills": ["Code Review"], "available": true }
Agent calls: get-user { "id": 42 }          → check profile & schedule
Agent calls: create-schedule { ... }         → book the slot
```

### Compare rates across specialists

```
You: What do DevOps engineers charge on this platform?

Agent calls: search-specialists { "skills": ["DevOps"] }

→ Returns list with rates — agent summarizes min/max/avg
```

### Hire a designer under $50/hr

```
You: Find a UI/UX designer under $50/hr who speaks English

Agent calls: search-specialists {
  "skills": ["UI/UX", "Design"],
  "max_rate": 50,
  "languages": ["English"]
}

→ Filtered results matching all criteria
```

See [EXAMPLES.md](EXAMPLES.md) for more detailed scenarios.

## Billing

- **Free:** Register, search, browse specialists, view profiles
- **Professional:** $20/mo — full access, scheduling, priority search
- **Business:** $30/mo — team features, analytics, API limits increased
- **Payments:** BTC, ETH, USDT, USDC — **zero platform commission**
- Use `get-pricing` tool for current plans and per-action costs

## Discovery

- **MCP config:** `https://ceki.me/.well-known/mcp.json`
- **Agent card:** `https://ceki.me/.well-known/agent.json`
- **DNS TXT:** `dig TXT ceki.me` → MCPv1 record
- **Docs:** [ceki.me/mcp](https://ceki.me/mcp)
- **LLM context:** [ceki.me/llms.txt](https://ceki.me/llms.txt)
- **Official MCP Registry:** [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)
- **Smithery:** [smithery.ai](https://smithery.ai/servers/ceki)
- **mcp.so:** [mcp.so](https://mcp.so)

## Links

- [Ceki.me](https://ceki.me) — main site
- [MCP Integration Guide](https://ceki.me/mcp) — detailed documentation
- [API Endpoint](https://api.ceki.me/mcp/agent) — server URL

## License

MIT
