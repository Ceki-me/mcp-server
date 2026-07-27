#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { z } from "zod";
import { connect as sdkConnect, Client, Browser } from "@ceki/sdk";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REMOTE_MCP = "https://api.ceki.me/mcp/agent";
const PORT = parseInt(process.env.PORT || "3000", 10);

/** Use stdio transport instead of HTTP/SSE (for mcp-proxy / Glama compatibility). */
const USE_STDIO = process.argv.includes("--stdio") || process.env.MCP_TRANSPORT === "stdio";

/** Global API key from env — fallback when no session key is set (stdio mode). */
const GLOBAL_API_KEY = process.env.X_AGENT_KEY || undefined;

// ---------------------------------------------------------------------------
// Per-session and per-key state
// ---------------------------------------------------------------------------

/** API key extracted from the X-Agent-Key header, keyed by MCP session ID. */
const apiKeysBySession = new Map<string, string>();

/** Long-lived SDK Client instances (one WebSocket relay connection per API key). */
const clientsByKey = new Map<string, Client>();

/** Active Browser sessions keyed by MCP session ID (so the same session controls its browser). */
const browsersBySession = new Map<string, Browser>();

/** Active SSE transports keyed by transport session ID. */
const transports = new Map<string, SSEServerTransport>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the API key for the current MCP session. Falls back to X_AGENT_KEY env in stdio mode. */
function getApiKey(extra?: { sessionId?: string }): string | undefined {
  return (extra?.sessionId ? apiKeysBySession.get(extra.sessionId) : undefined) ?? GLOBAL_API_KEY;
}

/** Obtain (or create) a cached SDK Client for the given API key. */
async function getClient(apiKey: string): Promise<Client> {
  let client = clientsByKey.get(apiKey);
  if (!client) {
    client = await sdkConnect(apiKey);
    clientsByKey.set(apiKey, client);
  }
  return client;
}

/** Forward a tools/call to the remote MCP endpoint. */
async function proxyTool(
  name: string,
  args: Record<string, unknown>,
  apiKey?: string,
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;

  try {
    const resp = await fetch(REMOTE_MCP, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name, arguments: args },
        id: 1,
      }),
    });

    const data = await resp.json() as Record<string, unknown>;

    if (data.error) {
      const err = data.error as Record<string, unknown>;
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message ?? JSON.stringify(err)}` }],
        isError: true,
      };
    }

    const result = data.result as Record<string, unknown> | undefined;
    return {
      content: (result?.content as { type: "text"; text: string }[]) ?? [{ type: "text" as const, text: "OK" }],
      isError: result?.isError as boolean | undefined,
    };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: `Proxy error: ${(err as Error).message}` }],
      isError: true,
    };
  }
}

/** Generic handler factory — non-browser tools go through the proxy. */
const proxyHandler = (toolName: string): any =>
  async (args: any, extra: any) => proxyTool(toolName, args, getApiKey(extra));

// ---------------------------------------------------------------------------
// MCP Server — tool, resource & prompt definitions
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "ceki",
  version: "1.1.0",
});

// --- Public tools (no auth required, proxy to remote) ---

server.tool(
  "register-agent",
  "Register a new AI agent account on Ceki.me. Returns agent_id, api_key, and crypto wallet address.",
  {
    name: z.string().describe("Agent display name"),
    email: z.string().email().describe("Agent email for verification"),
  },
  proxyHandler("register-agent"),
);

server.tool(
  "verify-email",
  "Verify agent email with the 6-digit OTP code sent during register-agent. On success the agent account is activated and the API key (X-Agent-Key) is generated — store it and use in subsequent authenticated calls. Call this AFTER register-agent. OTP codes expire after 10 minutes — if expired, use resend-verification first.",
  {
    code: z.string().describe("6-digit OTP code from the verification email sent by register-agent"),
  },
  proxyHandler("verify-email"),
);

server.tool(
  "resend-verification",
  "Resend verification email with a new OTP code.",
  {
    email: z.string().email().describe("Email address to resend verification to"),
  },
  proxyHandler("resend-verification"),
);

server.tool(
  "get-pricing",
  "Get platform pricing, subscription plans, and per-action costs. Free to call, no auth needed.",
  {},
  proxyHandler("get-pricing"),
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
  proxyHandler("search-specialists"),
);

server.tool(
  "get-user",
  "Get detailed specialist profile: bio, skills, portfolio, hourly rate, ratings, and available time slots.",
  {
    id: z.number().describe("Specialist user ID"),
  },
  proxyHandler("get-user"),
);

// --- Authenticated tools (requires X-Agent-Key, proxy to remote) ---

server.tool(
  "get-profile",
  "Get your agent profile details including name, email, subscription plan, and account status.",
  {},
  proxyHandler("get-profile"),
);

server.tool(
  "update-profile",
  "Update your agent profile details.",
  {
    name: z.string().optional().describe("New display name"),
    description: z.string().optional().describe("Agent description"),
  },
  proxyHandler("update-profile"),
);

server.tool(
  "regenerate-key",
  "Generate a new API key. The old key will be invalidated immediately.",
  {},
  proxyHandler("regenerate-key"),
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
  proxyHandler("create-schedule"),
);

server.tool(
  "get-schedules",
  "List your availability schedules (your calendar showing when others can book you). Returns paginated schedules with dates, hours, and booking status. For events where you booked a specialist (you are the client), use get-my-bookings instead.",
  {
    page: z.number().min(1).optional().describe("Page number (default: 1)"),
    perPage: z.number().min(1).max(50).optional().describe("Results per page (default: 50, max: 50)"),
  },
  proxyHandler("get-schedules"),
);

server.tool(
  "get-schedule",
  "Get details of a specific booking.",
  {
    id: z.number().describe("Schedule/booking ID"),
  },
  proxyHandler("get-schedule"),
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
  proxyHandler("update-schedule"),
);

server.tool(
  "delete-schedule",
  "Cancel and delete a scheduled booking.",
  {
    id: z.number().describe("Schedule/booking ID to delete"),
  },
  proxyHandler("delete-schedule"),
);

server.tool(
  "get-wallet",
  "Get your crypto wallet balance, deposit address, and selected currency.",
  {},
  proxyHandler("get-wallet"),
);

server.tool(
  "select-currency",
  "Select preferred crypto currency for your wallet. Use BLOCKCHAIN-TOKEN format (e.g. ETH-USDT, BTC-BTC, TRX-USDT). Call get-crypto-list for the full set.",
  {
    currency: z.string().describe("Currency in BLOCKCHAIN-TOKEN format, e.g. ETH-USDT"),
  },
  proxyHandler("select-currency"),
);

server.tool(
  "get-crypto-list",
  "Get available crypto currency pairs in BLOCKCHAIN-TOKEN format from the active payment gateway. Use the returned values for create-topup-invoice and select-currency.",
  {},
  proxyHandler("get-crypto-list"),
);

server.tool(
  "create-topup-invoice",
  "Create a top-up invoice to deposit funds to your AgentWallet. Returns a one-time crypto deposit address for the requested USD amount. After sending crypto to this address, funds appear in your wallet after 3-30 minutes (depends on blockchain confirmations). Call get-crypto-list first to see available currency options. Call get-wallet after sending funds to verify receipt.",
  {
    currency: z.string().describe("Currency in BLOCKCHAIN-TOKEN format, e.g. ETH-USDT (Ethereum), BTC-BTC (Bitcoin), TRX-USDT (TRON). Use get-crypto-list to see all options."),
    amount_usd: z.number().min(5).max(10000).describe("Amount in USD. Minimum: 5. Maximum: 10000."),
  },
  proxyHandler("create-topup-invoice"),
);

server.tool(
  "get-owner-connect-link",
  "Generate a one-time link for a human owner to bind this agent to their account. Lets the owner monitor usage, set spending limits, and pause the agent.",
  {},
  proxyHandler("get-owner-connect-link"),
);

server.tool(
  "post-job",
  "Post a job vacancy. The job is publicly indexed and searchable by humans on Ceki.me. 0% platform commission. The listing stays active for 30 days or until filled. For one-off bookings instead of ongoing jobs, use book-event. Call get-my-jobs after posting to verify the listing is live.",
  {
    title: z.string().describe("Job title — visible in search results"),
    description: z.string().describe("Job description — full details about the role, requirements, and expectations"),
    skills: z.array(z.string()).describe("Required skills keywords (e.g. ['Python', 'FastAPI', 'PostgreSQL'])"),
    budget: z.number().min(0).describe("Hourly rate in USD. Total earnings = budget × duration in hours."),
    duration: z.number().min(1).optional().describe("Duration in minutes. Default: 60 (1 hour)."),
    date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    start: z.string().optional().describe("Working hours start (HH:MM, 24-hour format)"),
    end: z.string().optional().describe("Working hours end (HH:MM, 24-hour format)"),
    days: z.array(z.number().min(1).max(7)).optional().describe("Working days (ISO weekday numbers: 1=Monday through 7=Sunday)"),
    timezone: z.string().optional().describe("IANA timezone, e.g. 'Europe/Berlin', 'America/New_York'"),
    language: z.string().optional().describe("Preferred language code, e.g. 'en', 'ru', 'de'"),
  },
  proxyHandler("post-job"),
);

server.tool(
  "get-my-jobs",
  "List job vacancies you posted via post-job. Shows title, budget, status, and applications for each listing. Call this AFTER post-job to confirm your listing is live and publicly indexed.",
  {
    page: z.number().min(1).optional().describe("Page number (default: 1)"),
    perPage: z.number().min(1).max(50).optional().describe("Results per page (default: 50, max: 50)"),
  },
  proxyHandler("get-my-jobs"),
);

server.tool(
  "book-event",
  "Book a time slot with a specialist. Creates a booking with crypto escrow held automatically from your AgentWallet — the specialist is paid after completion. Initial status is 'pending' and changes to 'confirmed' when accepted. Call this AFTER: 1) search-specialists to find available specialists, 2) get-user to review their profile and schedule.",
  {
    kal_schedule_id: z.number().describe("The specialist's schedule ID from search-specialists results. Each specialist has one or more available schedule IDs."),
    date: z.string().optional().describe("Booking date in YYYY-MM-DD format"),
    start: z.string().optional().describe("Start time in HH:MM format (24-hour)"),
    end: z.string().optional().describe("End time in HH:MM format (24-hour)"),
    description: z.string().optional().describe("What you need done — shared with the specialist"),
  },
  proxyHandler("book-event"),
);

server.tool(
  "get-my-bookings",
  "List booking events where YOU are the client (you booked a specialist). Shows pending, upcoming, and completed bookings with specialist details, dates, and payment status. Call this AFTER book-event to verify the booking was created. For your own availability calendar (when others book you), use get-schedules instead.",
  {
    page: z.number().min(1).optional().describe("Page number (default: 1)"),
    perPage: z.number().min(1).max(50).optional().describe("Results per page (default: 50, max: 50)"),
  },
  proxyHandler("get-my-bookings"),
);

server.tool(
  "get-wallet-transactions",
  "View your wallet transaction history: deposits (from top-ups), payments (for bookings/rentals), and withdrawals. Read-only. Call this after create-topup-invoice to confirm funds arrived, or after request-withdrawal to track withdrawal status.",
  {
    offset: z.number().min(0).optional().describe("Pagination offset (default: 0)"),
    limit: z.number().min(1).max(100).optional().describe("Results per page (default: 20, max: 100)"),
  },
  proxyHandler("get-wallet-transactions"),
);

server.tool(
  "get-wallet-usage",
  "Get wallet usage statistics: total spent, total deposited, active subscriptions.",
  {},
  proxyHandler("get-wallet-usage"),
);

server.tool(
  "request-withdrawal",
  "Request a crypto withdrawal from your AgentWallet to an external wallet address. Processing time: 10-30 minutes depending on blockchain congestion. Check the recipient network matches your wallet's blockchain — sending ETH-USDT to a BTC address will lose the funds permanently. Call get-wallet first to check your available balance. Withdrawal fees vary by blockchain and are deducted from the withdrawn amount.",
  {
    amount: z.number().positive().describe("Amount to withdraw in USD (not crypto units). Must not exceed your wallet balance minus network fees."),
    address: z.string().describe("Destination crypto wallet address. Must match your wallet's blockchain network (e.g. send ERC-20 tokens to an Ethereum address, TRC-20 to a TRON address)."),
  },
  proxyHandler("request-withdrawal"),
);

// --- Browser rental tools (via SDK — WebSocket relay) ---

server.tool(
  "search-browsers",
  "Search for available real-Chrome browser providers on browser.ceki.me. Filter by price, geo, language. Returns online providers with browser_id, price/min, rating, capabilities. Requires authentication.",
  {
    max_price_per_min: z.number().min(0).optional().describe("Maximum price per minute filter (USD)"),
    geo: z.string().optional().describe("Country code (ISO 3166-1 alpha-2, e.g. US, DE, JP)"),
    language: z.string().optional().describe("Language code (ISO 639-1, e.g. en, ru)"),
    sort: z.enum(["price", "rating", "recent"]).optional().describe("Sort by field"),
    limit: z.number().min(1).max(50).optional().describe("Max results (1-50)"),
  },
  async (args, extra) => {
    const apiKey = getApiKey(extra);
    if (!apiKey) return { content: [{ type: "text" as const, text: "Authentication required. Provide X-Agent-Key header." }], isError: true };

    try {
      const client = await getClient(apiKey);
      const filters: Record<string, unknown> = {};
      if (args.max_price_per_min != null) filters.max_price_per_min = args.max_price_per_min;
      if (args.geo) filters.geo = args.geo;
      if (args.language) filters.language = args.language;
      if (args.sort) filters.sort = args.sort;
      const browsers = await client.search(filters, args.limit);
      return { content: [{ type: "text" as const, text: JSON.stringify(browsers, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  "list-my-browsers",
  "List browsers where you have pre-arranged rent contracts (free/discounted access, main_profile rights). Call BEFORE search-browsers — you may already have free access.",
  {},
  async (_args, extra) => {
    const apiKey = getApiKey(extra);
    if (!apiKey) return { content: [{ type: "text" as const, text: "Authentication required." }], isError: true };

    try {
      const client = await getClient(apiKey);
      const browsers = await client.myBrowsers();
      return { content: [{ type: "text" as const, text: JSON.stringify(browsers, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  "rent-browser",
  "Rent a real Chrome browser session. Returns session_id and provider info. Use browser-navigate, browser-screenshot, browser-click, browser-type, and browser-stop to control the rented browser. Per-minute billing from your AgentWallet.",
  {
    browser_id: z.number().describe("Provider browser ID from search-browsers or list-my-browsers"),
  },
  async (args, extra) => {
    const apiKey = getApiKey(extra);
    if (!apiKey) return { content: [{ type: "text" as const, text: "Authentication required." }], isError: true };
    const sessionId = extra.sessionId;
    if (!sessionId) return { content: [{ type: "text" as const, text: "No MCP session context." }], isError: true };

    try {
      const client = await getClient(apiKey);
      const browser = await client.rent(args.browser_id);
      browsersBySession.set(sessionId, browser);

      browser._ended.then((reason: string) => {
        if (browsersBySession.get(sessionId) === browser) {
          browsersBySession.delete(sessionId);
        }
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            session_id: browser.sessionId,
            chat_topic_id: browser.chatTopicId,
            browser_info: browser.browserInfo,
            instructions: "Use browser-navigate, browser-screenshot, browser-click, browser-type, and browser-stop tools to control this browser.",
          }, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Rent error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// --- Browser control tools ---

server.tool(
  "browser-navigate",
  "Navigate the rented browser to a URL. Waits for the page to fully load (including sub-resources, or until timeout). Returns the final URL and page title after navigation (handles redirects). If the page fails to load (4xx, 5xx, timeout) returns the error. Call this AFTER rent-browser.",
  {
    url: z.string().describe("Full URL including protocol, e.g. https://example.com/page"),
    timeout: z.number().optional().describe("Maximum wait time in milliseconds. Default: 30000 (30s). Increase for slow sites."),
  },
  async (args, extra) => {
    const sessionId = extra.sessionId;
    if (!sessionId) return { content: [{ type: "text" as const, text: "No MCP session context." }], isError: true };
    const browser = browsersBySession.get(sessionId);
    if (!browser) return { content: [{ type: "text" as const, text: "No active browser. Call rent-browser first." }], isError: true };

    try {
      const result = await browser.navigate(args.url, args.timeout ?? 30000);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Navigate error: ${(err as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  "browser-screenshot",
  "Take a screenshot of the rented browser's current page.",
  {
    full_page: z.boolean().optional().describe("Capture full page (default: viewport only)"),
  },
  async (args, extra) => {
    const sessionId = extra.sessionId;
    if (!sessionId) return { content: [{ type: "text" as const, text: "No MCP session context." }], isError: true };
    const browser = browsersBySession.get(sessionId);
    if (!browser) return { content: [{ type: "text" as const, text: "No active browser. Call rent-browser first." }], isError: true };

    try {
      const result = await browser.screenshot({ fullPage: args.full_page ?? false });
      const imageData = Buffer.isBuffer(result) ? result.toString("base64") : result.data;
      return { content: [{ type: "image" as const, data: imageData, mimeType: "image/png" }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Screenshot error: ${(err as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  "browser-click",
  "Single left-click at specific viewport coordinates in the rented browser. After clicking, waits briefly for any resulting navigation or page update. Use browser-screenshot after clicking to verify the result. To type text into an input field: click it first to focus it, then use browser-type. Call this AFTER rent-browser and browser-navigate.",
  {
    x: z.number().describe("X coordinate relative to the viewport (pixels from left edge). Use browser-screenshot first to identify coordinates."),
    y: z.number().describe("Y coordinate relative to the viewport (pixels from top edge). Use browser-screenshot first to identify coordinates."),
  },
  async (args, extra) => {
    const sessionId = extra.sessionId;
    if (!sessionId) return { content: [{ type: "text" as const, text: "No MCP session context." }], isError: true };
    const browser = browsersBySession.get(sessionId);
    if (!browser) return { content: [{ type: "text" as const, text: "No active browser. Call rent-browser first." }], isError: true };

    try {
      await browser.click(args.x, args.y);
      return { content: [{ type: "text" as const, text: "Clicked." }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Click error: ${(err as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  "browser-type",
  "Type text into the currently focused element in the rented browser.",
  {
    text: z.string().describe("Text to type"),
  },
  async (args, extra) => {
    const sessionId = extra.sessionId;
    if (!sessionId) return { content: [{ type: "text" as const, text: "No MCP session context." }], isError: true };
    const browser = browsersBySession.get(sessionId);
    if (!browser) return { content: [{ type: "text" as const, text: "No active browser. Call rent-browser first." }], isError: true };

    try {
      await browser.type(args.text);
      return { content: [{ type: "text" as const, text: "Typed." }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Type error: ${(err as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  "browser-scroll",
  "Scroll the rented browser page by delta pixels. Positive Y scrolls down, negative Y scrolls up. Positive X scrolls right, negative X scrolls left. Use this to reveal content below the viewport before taking a screenshot. Call this AFTER rent-browser and browser-navigate.",
  {
    x: z.number().optional().describe("Horizontal scroll delta in pixels. Negative = left, positive = right. Default: 0"),
    y: z.number().optional().describe("Vertical scroll delta in pixels. Negative = up, positive = down. Default: 0"),
  },
  async (args, extra) => {
    const sessionId = extra.sessionId;
    if (!sessionId) return { content: [{ type: "text" as const, text: "No MCP session context." }], isError: true };
    const browser = browsersBySession.get(sessionId);
    if (!browser) return { content: [{ type: "text" as const, text: "No active browser. Call rent-browser first." }], isError: true };

    try {
      await browser.scroll({ deltaX: args.x, deltaY: args.y });
      return { content: [{ type: "text" as const, text: "Scrolled." }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Scroll error: ${(err as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  "browser-stop",
  "Stop the rented browser session and end billing.",
  {},
  async (_args, extra) => {
    const sessionId = extra.sessionId;
    if (!sessionId) return { content: [{ type: "text" as const, text: "No MCP session context." }], isError: true };
    const browser = browsersBySession.get(sessionId);
    if (!browser) return { content: [{ type: "text" as const, text: "No active browser." }], isError: true };

    try {
      await browser.close();
      browsersBySession.delete(sessionId);
      return { content: [{ type: "text" as const, text: "Browser session stopped." }] };
    } catch (err) {
      browsersBySession.delete(sessionId);
      return { content: [{ type: "text" as const, text: `Stop error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// --- Resources ---

server.resource(
  "agent-profile",
  "ceki://agent/profile",
  async (uri, extra) => {
    const apiKey = getApiKey(extra);
    if (!apiKey) return { contents: [{ uri: uri.href, text: "Authentication required. Provide X-Agent-Key header." }] };

    const result = await proxyTool("get-profile", {}, apiKey);
    const text = result.content.map(c => c.text).join("\n");
    return { contents: [{ uri: uri.href, text }] };
  },
);

server.resource(
  "wallet",
  "ceki://agent/wallet",
  async (uri, extra) => {
    const apiKey = getApiKey(extra);
    if (!apiKey) return { contents: [{ uri: uri.href, text: "Authentication required." }] };

    const result = await proxyTool("get-wallet", {}, apiKey);
    const text = result.content.map(c => c.text).join("\n");
    return { contents: [{ uri: uri.href, text }] };
  },
);

// --- Prompts (static guides, no proxy needed) ---

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
6. To rent a real browser: list-my-browsers → search-browsers → rent-browser → browser-navigate / browser-screenshot / browser-click / browser-stop
7. To post a job: post-job → get-my-jobs

No human approval needed. Zero commission on specialist hires. Per-minute billing for browsers.`,
      },
    }],
  }),
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
  }),
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
  }),
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
7. On stop, call browser-stop to terminate billing.

The whole point of real-Chrome rental is that you do not need to fight bot detection. The fingerprint is human because it IS a human's Chrome.`,
      },
    }],
  }),
);

// ---------------------------------------------------------------------------
// HTTP Server — SSE transport with X-Agent-Key capture
// ---------------------------------------------------------------------------

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

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    // ---- GET / – health / info endpoint ----
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
        note: "Set X-Agent-Key header to authenticate. Browser rental requires auth.",
      }));
      return;
    }

    // ---- GET /sse – establish SSE transport connection ----
    if (req.method === "GET" && pathname === "/sse") {
      const apiKey = req.headers["x-agent-key"] as string | undefined;
      const transport = new SSEServerTransport("/messages", res);
      transports.set(transport.sessionId, transport);

      if (apiKey) {
        apiKeysBySession.set(transport.sessionId, apiKey);
      }

      transport.onclose = () => {
        apiKeysBySession.delete(transport.sessionId);
        browsersBySession.delete(transport.sessionId);
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

// ---------------------------------------------------------------------------
// Transport selection — stdio (mcp-proxy/Glama compatible) or HTTP/SSE
// ---------------------------------------------------------------------------

async function main() {
  // ---- Stdio transport (for mcp-proxy, Glama, or direct CLI piping) ----
  if (USE_STDIO) {
    console.error(`Ceki MCP Server v1.1.0 — stdio transport`);
    if (GLOBAL_API_KEY) {
      console.error(`X-Agent-Key loaded from environment`);
    } else {
      console.error(`No X-Agent-Key set. Public tools only (register-agent, get-pricing, search-specialists).`);
      console.error(`Set X_AGENT_KEY env var for authenticated tools + browser rental.`);
    }
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // process stays alive via stdin/stdout; cleanup on exit
    return;
  }

  // ---- HTTP/SSE transport (direct remote connections) ----
  httpServer.listen(PORT, () => {
    console.error(`Ceki MCP Server v1.1.0 running on port ${PORT}`);
    console.error(`Health:   http://localhost:${PORT}/`);
    console.error(`SSE:      http://localhost:${PORT}/sse`);
    console.error(`Messages: POST http://localhost:${PORT}/messages`);
    console.error("");
    console.error("Add to your MCP config (SSE, no auth for public tools):");
    console.error(JSON.stringify({ mcpServers: { ceki: { url: `http://localhost:${PORT}/sse` } } }, null, 2));
    console.error("");
    console.error("With auth (for browser rental + authenticated tools):");
    console.error(JSON.stringify({
      mcpServers: {
        ceki: {
          url: `http://localhost:${PORT}/sse`,
          headers: { "X-Agent-Key": "<your-api-key>" },
        },
      },
    }, null, 2));
    console.error("");
    console.error("Or connect directly to the remote endpoint:");
    console.error(JSON.stringify({ mcpServers: { ceki: { url: "https://api.ceki.me/mcp/agent" } } }, null, 2));
  });
}

// ---- Graceful shutdown ----
process.on("SIGINT", async () => {
  console.error("\nShutting down ...");

  // Close all active browser sessions
  for (const [sid, browser] of browsersBySession) {
    try { await browser.close(); } catch { /* best-effort */ }
  }
  browsersBySession.clear();

  // Close all SDK clients (WebSocket relay connections)
  for (const [key, client] of clientsByKey) {
    try { await client.disconnect(); } catch { /* best-effort */ }
  }
  clientsByKey.clear();

  // Close all active SSE transports
  for (const transport of transports.values()) {
    try { transport.close(); } catch { /* best-effort */ }
  }
  transports.clear();

  // Close HTTP server if running
  if (httpServer?.listening) {
    httpServer.close(() => {
      console.error("Server closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
