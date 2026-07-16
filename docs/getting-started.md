---
title: Getting Started with Ceki MCP Server
description: How to connect AI agents to real residential browsers
---

# Getting Started with Ceki MCP Server

## Quick Start

1. Get your API key at [browser.ceki.me](https://browser.ceki.me)
2. Connect to `https://api.ceki.me/mcp/agent`
3. Send `X-Agent-Key` header with your key
4. Call `browser_rent` to get a real browser session

## Example

```javascript
const response = await fetch('https://api.ceki.me/mcp/agent', {
  method: 'POST',
  headers: {
    'X-Agent-Key': 'your-key-here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    method: 'tools/call',
    params: {
      name: 'browser_rent',
      arguments: {
        minutes: 30,
        headless: false
      }
    }
  })
});
```

## Why Real Browsers?

AI agents need to browse the web like humans. [Learn why P2P browsers outperform headless](https://telegra.ph/The-P2P-Browser-Network-Turning-Idle-Tabs-Into-Income-07-16).
