# Ceki MCP Server

Ceki.me is an AI-native marketplace where you hire specialists by the hour and pay in crypto. This MCP server lets AI agents search specialists, manage schedules, and handle payments — all through the [Model Context Protocol](https://modelcontextprotocol.io/).

**Endpoint:** `https://api.ceki.me/mcp/agent`
**Transport:** Streamable HTTP
**Auth:** `X-Agent-Key` header (self-registration, no human approval needed)

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

### Cursor / Windsurf / VS Code

Same config format. Add to your MCP settings and connect.

### CLI

```bash
claude mcp add ceki --url https://api.ceki.me/mcp/agent
```

## Tools

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
| `get-wallet` | Get wallet balance and status |
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

## Billing

- **Free tier:** Register, search, browse specialists
- **Subscriptions:** $20/mo (Professional), $30/mo (Business)
- **Payments:** BTC, ETH, USDT, USDC — zero platform commission
- Use `get-pricing` tool for current plans

## Example: Find a React Developer

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

## Discovery

- **MCP config:** `https://ceki.me/.well-known/mcp.json`
- **Agent card:** `https://ceki.me/.well-known/agent.json`
- **DNS TXT:** `dig TXT ceki.me` → MCPv1 record
- **Docs:** [ceki.me/mcp](https://ceki.me/mcp)
- **LLM context:** [ceki.me/llms.txt](https://ceki.me/llms.txt)

## Links

- [Ceki.me](https://ceki.me) — main site
- [Documentation](https://ceki.me/mcp) — MCP integration guide
- [API Status](https://api.ceki.me/mcp/agent) — server endpoint

## License

MIT
