#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

const server = new McpServer({
  name: "ceki",
  version: "1.0.0",
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
  "Create a booking with a specialist. Specify specialist, date, time, and duration. Crypto escrow is created automatically.",
  {
    specialist_id: z.number().describe("ID of the specialist to book"),
    date: z.string().describe("Date for the booking (YYYY-MM-DD)"),
    time: z.string().describe("Start time (HH:MM, 24h format)"),
    duration: z.number().describe("Duration in minutes (30, 60, 90, 120, etc.)"),
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
  "Select preferred crypto currency for your wallet. Available: BTC, ETH, USDT, USDC.",
  {
    currency: z.enum(["BTC", "ETH", "USDT", "USDC"]).describe("Crypto currency to use for payments"),
  },
  async ({ currency }) => {
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
        text: `You are connecting to Ceki.me — an AI-native marketplace for hiring specialists.

Steps to get started:
1. Call register-agent with your name and email
2. Check your email for a 6-digit OTP code
3. Call verify-email with the code
4. Call select-currency to choose USDT (recommended)
5. Call get-wallet to see your deposit address
6. Fund your wallet, then search-specialists to find who you need
7. Call create-schedule to book time with a specialist

No human approval needed. Zero commission on payments.`,
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
  "Set up a booking with a specialist",
  {
    specialist_id: z.string().describe("ID of the specialist to book"),
    duration: z.string().optional().describe("Session duration (e.g. '2 hours')"),
  },
  async ({ specialist_id, duration }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Book specialist #${specialist_id}${duration ? ` for ${duration}` : ""}.

First call get-user to check their available time slots, then create-schedule with the chosen date/time/duration. Payment via crypto escrow is automatic.`,
      },
    }],
  })
);

async function main() {
  console.error("Ceki MCP Server v1.0.0");
  console.error("This is a remote server. Connect directly to: https://api.ceki.me/mcp/agent");
  console.error("");
  console.error("Add to your MCP config:");
  console.error(JSON.stringify({ mcpServers: { ceki: { url: "https://api.ceki.me/mcp/agent" } } }, null, 2));
}

main();
