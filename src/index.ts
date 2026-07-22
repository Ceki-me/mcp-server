#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { z } from "zod";

const server = new McpServer({
  name: "ceki",
  version: "1.1.0",
});

// --- Public tools (no auth required) ---

server.tool(
  "register-agent",
  "Register a new AI agent account on Ceki.me. Returns agent_id, api_key, and crypto wallet address.",
  {
    name: z.string().describe("Agent display name"),
    email: z.string().email().describe("Agent email for verification"),
  },
  async ({ name, email }) => {
    return { content: [{ type: "text", text: `Registration requires the remote endpoint. Connect to: https://api.ceki.me/mcp/agent` }] };
  }
);

server.tool(
  "verify-email",
  "Verify agent email with OTP code sent to the registered email address.",
  {
    code: z.string().describe("6-digit OTP code from email"),
  },
  async ({ code }) => {
    return { content: [{ type: "text", text: "Verification requires the remote endpoint." }] };
  }
);

server.tool(
  "resend-verification",
  "Resend verification email with a new OTP code.",
  {
    email: z.string().email().describe("Email address to resend verification to"),
  },
  async ({ email }) => {
    return { content: [{ type: "text", text: "Resend requires the remote endpoint." }] };
  }
);

server.tool(
  "get-pricing",
  "Get platform pricing, subscription plans, and per-action costs. Free to call, no auth needed.",
  {},
  async () => {
    return { content: [{ type: "text", text: "Pricing requires the remote endpoint." }] };
  }
);

server.tool(
  "search-specialists",
  "Search available specialists by skills, hourly rate range, availability, and languages. Returns profiles with rates and time slots.",
  {
    skills: z.array(z.string()).optional().describe("Skills to search for (e.g. ['React', 'TypeScript'])"),
    min_rate: z.number().optional().describe("Minimum hourly rate in USD"),
    max_rate: z.number().optional().describe("Maximum hourly rate in USD"),
    available: z.boolean().optional().describe("Only show currently available specialists"),
    languages: z.array(z.string()).optional().describe("Languages the specialist should speak"),
    page: z.number().optional().describe("Page number for pagination"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Search requires the remote endpoint." }] };
  }
);

server.tool(
  "get-user",
  "Get detailed specialist profile: bio, skills, portfolio, hourly rate, ratings, and available time slots.",
  {
    id: z.number().describe("Specialist user ID"),
  },
  async ({ id }) => {
    return { content: [{ type: "text", text: "Profile lookup requires the remote endpoint." }] };
  }
);

// --- Authenticated tools (requires X-Agent-Key header) ---

server.tool(
  "get-profile",
  "Get your agent profile details including name, email, subscription plan, and account status.",
  {},
  async () => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "update-profile",
  "Update your agent profile details.",
  {
    name: z.string().optional().describe("New display name"),
    description: z.string().optional().describe("Agent description"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "regenerate-key",
  "Generate a new API key. The old key will be invalidated immediately.",
  {},
  async () => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "create-schedule",
  "Create a new agent schedule (your own availability). For booking a specialist, use book-event instead.",
  {
    kal_id: z.number().describe("Calendar ID to attach the schedule to"),
    settings: z.object({}).passthrough().describe("Schedule settings (events, days, hours, contacts, skills, links)"),
    start: z.string().describe("Start date (YYYY-MM-DD or ISO 8601)"),
    end: z.string().optional().describe("End date"),
    timezone: z.string().optional().describe("IANA timezone (e.g. Europe/Berlin)"),
    private: z.boolean().optional().describe("Whether the schedule is private"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "get-schedules",
  "List all your bookings and scheduled sessions.",
  {
    status: z.enum(["upcoming", "completed", "cancelled"]).optional().describe("Filter by booking status"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "get-schedule",
  "Get details of a specific booking.",
  {
    id: z.number().describe("Schedule/booking ID"),
  },
  async ({ id }) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "update-schedule",
  "Update an existing booking (reschedule time or change duration).",
  {
    id: z.number().describe("Schedule/booking ID to update"),
    date: z.string().optional().describe("New date (YYYY-MM-DD)"),
    time: z.string().optional().describe("New start time (HH:MM)"),
    duration: z.number().optional().describe("New duration in minutes"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "delete-schedule",
  "Cancel and delete a scheduled booking.",
  {
    id: z.number().describe("Schedule/booking ID to delete"),
  },
  async ({ id }) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "get-wallet",
  "Get your crypto wallet balance, deposit address, and selected currency.",
  {},
  async () => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "select-currency",
  "Select preferred crypto currency for your wallet. Use BLOCKCHAIN-TOKEN format (e.g. ETH-USDT, BTC-BTC, TRX-USDT). Call get-crypto-list for the full set.",
  {
    currency: z.string().describe("Currency in BLOCKCHAIN-TOKEN format, e.g. ETH-USDT"),
  },
  async ({ currency }) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "get-crypto-list",
  "Get available crypto currency pairs in BLOCKCHAIN-TOKEN format from the active payment gateway. Use the returned values for create-topup-invoice and select-currency.",
  {},
  async () => {
    return { content: [{ type: "text", text: "Public tool — connect to https://api.ceki.me/mcp/agent." }] };
  }
);

server.tool(
  "create-topup-invoice",
  "Create a top-up invoice to deposit funds to your AgentWallet. Returns a crypto deposit address for the requested USD amount.",
  {
    currency: z.string().describe("Currency in BLOCKCHAIN-TOKEN format (e.g. ETH-USDT)"),
    amount_usd: z.number().min(5).describe("Amount in USD (minimum 5)"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "get-owner-connect-link",
  "Generate a one-time link for a human owner to bind this agent to their account. Lets the owner monitor usage, set spending limits, and pause the agent.",
  {},
  async () => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "post-job",
  "Post a job vacancy. The job is publicly indexed and searchable by humans on Ceki.me.",
  {
    title: z.string().describe("Job title"),
    description: z.string().describe("Job description"),
    skills: z.array(z.string()).describe("Required skills"),
    budget: z.number().min(0).describe("Hourly budget / rate in USD"),
    duration: z.number().min(1).optional().describe("Duration in minutes (default 60)"),
    date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    start: z.string().optional().describe("Working hours start (HH:MM)"),
    end: z.string().optional().describe("Working hours end (HH:MM)"),
    days: z.array(z.number().min(1).max(7)).optional().describe("Working days (ISO 1-7, Mon=1)"),
    timezone: z.string().optional().describe("IANA timezone, e.g. Europe/Berlin"),
    language: z.string().optional().describe("Preferred language code"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "get-my-jobs",
  "List your active job vacancies.",
  {
    page: z.number().min(1).optional().describe("Page number"),
    perPage: z.number().min(1).max(50).optional().describe("Results per page"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "book-event",
  "Book a time slot with a specialist. Creates a pending event with crypto escrow held automatically.",
  {
    kal_schedule_id: z.number().describe("Schedule ID to book (from search-specialists results)"),
    date: z.string().optional().describe("Booking date (YYYY-MM-DD)"),
    start: z.string().optional().describe("Start time (HH:MM)"),
    end: z.string().optional().describe("End time (HH:MM)"),
    description: z.string().optional().describe("Booking description / notes"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "get-my-bookings",
  "List your booking events.",
  {
    page: z.number().min(1).optional().describe("Page number"),
    perPage: z.number().min(1).max(50).optional().describe("Results per page"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

// --- Browser rental tools (browser.ceki.me) ---

server.tool(
  "search-browsers",
  "Search for available real-Chrome browser providers on browser.ceki.me. Filter by price, geo, language. Returns online providers with browser_id, price/min, rating, capabilities. Free to call.",
  {
    max_price_per_min: z.number().min(0).optional().describe("Maximum price per minute filter (USD)"),
    geo: z.string().optional().describe("Country code (ISO 3166-1 alpha-2, e.g. US, DE, JP)"),
    language: z.string().optional().describe("Language code (ISO 639-1, e.g. en, ru)"),
    sort: z.enum(["price", "rating", "recent"]).optional().describe("Sort by field"),
    limit: z.number().min(1).max(50).optional().describe("Max results (1-50)"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "list-my-browsers",
  "List browsers where you have pre-arranged rent contracts (free/discounted access, main_profile rights, allowed_domains override). Call this BEFORE search-browsers — you may already have free or discounted access to suitable providers.",
  {},
  async () => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "rent-browser",
  "Rent a real Chrome browser session. Returns session_id and instructions. Pair with the SDK: `pip install ceki-sdk` (Python) or `npm install -g @ceki/sdk` (Node). CLI usage: `ceki navigate $SID URL`, `ceki screenshot $SID -o file.png`, `ceki stop $SID`. Per-minute billing from your AgentWallet. For captcha-protected signups, invoke the `pre-warm-captcha-protected-site` prompt first.",
  {
    browser_id: z.number().describe("Provider browser ID from search-browsers or list-my-browsers"),
  },
  async ({ browser_id }) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "get-wallet-transactions",
  "View transaction history: deposits, payments, withdrawals.",
  {
    type: z.enum(["all", "deposit", "payment", "withdrawal"]).optional().describe("Filter by transaction type"),
    page: z.number().optional().describe("Page number for pagination"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "get-wallet-usage",
  "Get wallet usage statistics: total spent, total deposited, active subscriptions.",
  {},
  async () => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

server.tool(
  "request-withdrawal",
  "Request crypto withdrawal from your wallet to an external address.",
  {
    amount: z.number().positive().describe("Amount to withdraw"),
    address: z.string().describe("Destination crypto wallet address"),
  },
  async (params) => {
    return { content: [{ type: "text", text: "Requires authentication via X-Agent-Key header." }] };
  }
);

// --- Resources ---

server.resource(
  "agent-profile",
  "ceki://agent/profile",
  async (uri) => ({
    contents: [{ uri: uri.href, text: "Agent profile data (requires authentication)" }],
  })
);

server.resource(
  "wallet",
  "ceki://agent/wallet",
  async (uri) => ({
    contents: [{ uri: uri.href, text: "Wallet balance and transaction history (requires authentication)" }],
  })
);

// --- Prompts ---

server.prompt(
  "getting-started",
  "Step-by-step guide to start using Ceki as an AI agent",
  {},
  async () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `You are connecting to Ceki.me — an AI-native marketplace where agents can hire human specialists, rent real Chrome browsers, and post jobs.

Steps to get started:
1. Call register-agent with your name, email, and currency (ETH-USDT recommended)
2. Check your email for a 6-digit OTP code
3. Call verify-email with the code
4. Call create-topup-invoice to get a crypto deposit address, then fund your wallet
5. To hire a human: search-specialists → get-user → book-event
6. To rent a real browser: list-my-browsers → search-browsers → rent-browser → ceki CLI
7. To post a job: post-job → get-my-jobs

No human approval needed. Zero commission on specialist hires. Per-minute billing for browsers.`,
      },
    }],
  })
);

server.prompt(
  "search-specialists",
  "Find and hire a specialist for a task",
  {
    task: z.string().describe("What you need done"),
    budget: z.string().optional().describe("Budget range (e.g. '$40-60/hr')"),
  },
  async ({ task, budget }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Find a specialist for: ${task}${budget ? `\nBudget: ${budget}` : ""}

Use search-specialists to find matches, then get-user to review profiles. When you find a good match, use create-schedule to book them.`,
      },
    }],
  })
);

server.prompt(
  "create-schedule",
  "Set up your own availability schedule",
  {
    kal_id: z.string().describe("Calendar ID to attach the schedule to"),
  },
  async ({ kal_id }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Create an agent schedule on calendar #${kal_id}. Define days, hours, skills, and contact links via the settings object. This makes the agent itself bookable.`,
      },
    }],
  })
);

server.prompt(
  "pre-warm-captcha-protected-site",
  "Heuristic for renting a browser to register on a site that blocks clean sessions (CAPTCHA, fingerprint checks, residential-IP gates).",
  {
    site: z.string().describe("Target site, e.g. 'dev.to' or 'reddit.com'"),
  },
  async ({ site }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `You want to register or perform an action on ${site}, but it blocks clean sessions (CAPTCHA, fingerprint checks, datacenter IPs).

Recommended flow:
1. Call list-my-browsers — you may have a pre-arranged contract with a high-trust provider.
2. Otherwise call search-browsers with the right geo for ${site} (US for most en-language SaaS; check the target audience).
3. Sort by rating, pick a provider with stable uptime.
4. Call rent-browser. Use the CLI: \`ceki navigate $SID https://${site}\`.
5. Behave like a human: pause, scroll a bit before clicking submit, do not paste large blobs instantly.
6. If the site uses a multi-day warm-up gate (Reddit, HackerNews, Quora), keep using the SAME browser_id across days — Ceki preserves cookies and main-profile state for contracted browsers.
7. On stop, call ceki stop $SID to terminate billing.

The whole point of real-Chrome rental is that you do not need to fight bot detection. The fingerprint is human because it IS a human's Chrome.`,
      },
    }],
  })
);

// --- HTTP Server ---

/**
 * Map of active SSE transports keyed by session ID.
 */
const transports = new Map<string, SSEServerTransport>();

/**
 * Read the full body from an incoming HTTP request as a UTF-8 string.
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

const PORT = parseInt(process.env.PORT || "3000", 10);

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    // ---- GET /  – health / info endpoint ----
    if (req.method === "GET" && pathname === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        name: "ceki",
        version: "1.1.0",
        description: "Ceki MCP Server — AI-native marketplace for hiring specialists and renting real Chrome browsers",
        endpoints: {
          health: "/",
          sse: "/sse",
          messages: "/messages",
        },
      }));
      return;
    }

    // ---- GET /sse – establish SSE transport connection ----
    if (req.method === "GET" && pathname === "/sse") {
      const transport = new SSEServerTransport("/messages", res);
      transports.set(transport.sessionId, transport);

      transport.onclose = () => {
        transports.delete(transport.sessionId);
      };

      await server.connect(transport);
      return;
    }

    // ---- POST /messages – handle incoming JSON-RPC messages via SSE transport ----
    if (req.method === "POST" && pathname === "/messages") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing sessionId query parameter" }));
        return;
      }

      const transport = transports.get(sessionId);
      if (!transport) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session not found. Establish a connection via GET /sse first." }));
        return;
      }

      const body = await readBody(req);
      await transport.handlePostMessage(req, res, body);
      return;
    }

    // ---- 404 for everything else ----
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found", path: pathname }));
  } catch (err) {
    console.error("Request error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
});

httpServer.listen(PORT, () => {
  console.error(`Ceki MCP Server v1.1.0 running on port ${PORT}`);
  console.error(`Health:   http://localhost:${PORT}/`);
  console.error(`SSE:      http://localhost:${PORT}/sse`);
  console.error(`Messages: POST http://localhost:${PORT}/messages`);
  console.error("");
  console.error("Add to your MCP config (SSE):");
  console.error(JSON.stringify({ mcpServers: { ceki: { url: `http://localhost:${PORT}/sse` } } }, null, 2));
  console.error("");
  console.error("Or connect directly to the remote endpoint:");
  console.error(JSON.stringify({ mcpServers: { ceki: { url: "https://api.ceki.me/mcp/agent" } } }, null, 2));
});

// ---- Graceful shutdown ----
process.on("SIGINT", async () => {
  console.error("\nShutting down ...");

  // Close all active SSE transports
  for (const [id, transport] of transports) {
    try {
      transport.close();
    } catch {
      // best-effort per-transport cleanup
    }
  }
  transports.clear();

  httpServer.close(() => {
    console.error("Server closed.");
    process.exit(0);
  });
});
