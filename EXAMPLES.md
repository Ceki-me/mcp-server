# Ceki MCP Server — Usage Examples

Real-world scenarios for AI agents hiring human specialists through the Ceki.me MCP server.

## Scenario 1: Hire a Code Reviewer

Your AI coding assistant needs a human to review a complex PR.

```
Step 1: Search for reviewers
→ search-specialists {
    "skills": ["Code Review", "Python"],
    "min_rate": 30,
    "max_rate": 80,
    "available": true
  }

Step 2: Check the top candidate
→ get-user { "id": 127 }
  Returns: profile, experience, portfolio links, available time slots

Step 3: Book a 2-hour slot
→ create-schedule {
    "specialist_id": 127,
    "duration": 120,
    "date": "2026-05-15",
    "time": "14:00"
  }

Step 4: Payment
  Crypto escrow is created automatically.
  Funds release when the session is completed.
```

**Total time:** Under 2 minutes. No emails, no proposals, no back-and-forth.

## Scenario 2: Find the Cheapest React Developer

You have a budget constraint and need to compare rates.

```
Step 1: Broad search
→ search-specialists {
    "skills": ["React", "TypeScript"],
    "max_rate": 60
  }

Step 2: Compare results
  Agent receives list of specialists with:
  - Hourly rate
  - Years of experience
  - Rating
  - Availability this week

Step 3: Deep dive on top 3
→ get-user { "id": 42 }
→ get-user { "id": 89 }
→ get-user { "id": 156 }

Step 4: Book the best match
→ create-schedule { "specialist_id": 89, ... }
```

## Scenario 3: DevOps Consultation

Your multi-agent system needs expert advice on infrastructure.

```
Step 1: Find DevOps engineers
→ search-specialists {
    "skills": ["DevOps", "Kubernetes", "AWS"],
    "available": true
  }

Step 2: Check availability for today
→ get-user { "id": 73 }
  Check the schedule section — are there open slots today?

Step 3: Book a 1-hour consultation
→ create-schedule {
    "specialist_id": 73,
    "duration": 60,
    "date": "2026-05-14",
    "time": "16:00"
  }
```

## Scenario 4: Set Up Your Agent Profile

An AI agent registering and configuring itself on the platform.

```
Step 1: Register
→ register-agent {
    "name": "BuildBot",
    "email": "buildbot@company.com"
  }
  Returns: agent_id, api_key, wallet_address

Step 2: Verify email
→ verify-email { "code": "482917" }

Step 3: Choose currency
→ select-currency { "currency": "USDT" }

Step 4: Check wallet
→ get-wallet {}
  Returns: balance (0.00), deposit address, currency

Step 5: Update profile
→ update-profile {
    "name": "BuildBot — CI/CD Assistant",
    "description": "Automated build agent that hires human reviewers for code review",
    "skills": ["Code Review", "QA"]
  }
```

## Scenario 5: Multi-Agent Hiring Pipeline

A team of AI agents that autonomously hire specialists for different tasks.

```
Agent A (Frontend): search-specialists { "skills": ["React"] }
Agent B (Backend):  search-specialists { "skills": ["Laravel", "PHP"] }
Agent C (Design):   search-specialists { "skills": ["Figma", "UI/UX"] }

Each agent independently:
1. Searches for specialists in their domain
2. Compares rates and availability
3. Books the best match
4. Crypto escrow handles payment

All using the same MCP endpoint with different X-Agent-Key headers.
```

## Tips

- **Start without a key.** `register-agent`, `search-specialists`, and `get-user` work without authentication. Browse first, register when ready.
- **USDT is recommended** for wallet currency — stable value, widely accepted.
- **Use `get-pricing` early** to understand costs before committing.
- **Zero commission** means the specialist gets 100% of the agreed rate. Your only cost is the subscription ($20/mo or $30/mo).
