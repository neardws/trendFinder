# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trend Finder is a TypeScript-based application that monitors AI/LLM trends from social media and news websites, analyzes them using AI models, and sends notifications via Slack or Discord. It runs as a scheduled job to collect trending content from configured sources.

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode with hot reloading (via nodemon)
npm run start

# Build TypeScript to JavaScript (outputs to ./dist)
npm run build

# Run the built application
node dist/index.js
```

## Docker Commands

```bash
# Build the Docker image
docker build -t trend-finder .

# Run with Docker
docker run -d -p 3000:3000 --env-file .env trend-finder

# Run with Docker Compose
docker-compose up --build -d

# Stop Docker Compose
docker-compose down
```

## Environment Configuration

The application requires a `.env` file (copy from `.env.example`). Key variables:

- **AI Models** (at least one required): `OPENAI_API_KEY`, `TOGETHER_API_KEY`, or `DEEPSEEK_API_KEY`
- **Data Sources**: `FIRECRAWL_API_KEY` (for web scraping)
- **Twitter/X Monitoring**: `RSSHUB_INSTANCE` (optional, defaults to `https://rsshub.app`)
- **Notifications**:
  - `NOTIFICATION_DRIVER`: Comma-separated list of platforms (e.g., `slack,discord,wechat`)
  - Platform-specific keys: `SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`, `SERVERCHAN_SENDKEY`

The application gracefully handles missing API keys by only monitoring sources for which credentials are available.

## Architecture

### Data Flow Pipeline

The application follows a four-stage pipeline orchestrated by `handleCron()` in `src/controllers/cron.ts`:

1. **Source Configuration** (`getCronSources.ts`)
   - Dynamically builds list of sources based on available API keys
   - Hardcoded sources include AI news sites and Twitter/X accounts
   - Returns array of `{identifier: string}` objects

2. **Content Scraping** (`scrapeSources.ts`)
   - Handles two types of sources:
     - **Twitter/X**: Uses RSSHub to fetch RSS feeds (free, no API key required). Filters tweets from last 24 hours and excludes retweets.
     - **Web pages**: Uses Firecrawl's `/extract` endpoint with structured schema extraction
   - Returns unified array of `Story` objects with `{headline, link, date_posted}`
   - Includes rate limit handling and error recovery
   - Uses `rss-parser` library to parse RSS feeds from RSSHub

3. **Draft Generation** (`generateDraft.ts`)
   - Currently uses OpenAI's `o3-mini` model with `reasoning_effort: "medium"`
   - Converts raw stories into formatted bullet-point summary
   - System prompt instructs model to return JSON with `interestingTweetsOrStories` array
   - Fallback handling for empty results

4. **Notification Delivery** (`sendDraft.ts`)
   - Supports three platforms: Slack, Discord, and WeChat (via Server酱)
   - Multi-platform push: Can send to multiple platforms simultaneously
   - `NOTIFICATION_DRIVER` accepts comma-separated values (e.g., `discord,wechat`)
   - All notifications sent in parallel using `Promise.allSettled()`
   - Discord: Includes `flags: 4` to suppress embeds
   - WeChat: Uses Server酱 API (`https://sctapi.ftqq.com/{SENDKEY}.send`)
   - Uses axios for HTTP requests
   - Returns success/failure summary for all platforms

### Key Design Patterns

- **RSSHub Integration**: Twitter/X monitoring uses RSSHub RSS feeds instead of expensive X API
- **Multi-Platform Notifications**: Single `NOTIFICATION_DRIVER` variable supports multiple platforms via comma separation
- **Parallel Notification Dispatch**: All platforms receive notifications simultaneously for speed
- **Graceful Failure Handling**: Failed notifications don't block successful ones (using `Promise.allSettled`)
- **Conditional Feature Loading**: Web sources are added to monitoring list only if `FIRECRAWL_API_KEY` exists; Twitter sources always available via RSSHub
- **Unified Story Format**: Both Twitter and web sources are normalized to same Story schema using Zod
- **Graceful Degradation**: Application continues with available sources even if some fail
- **Entry Point Flexibility**: `src/index.ts` can run immediately or as a cron job (currently configured to run once on startup; cron schedule is commented out)

## TypeScript Configuration

- Target: ES6
- Module: CommonJS
- Output: `./dist`
- Strict mode enabled
- All source in `./src`

## Cron Job Scheduling

The cron job is defined but commented out in `src/index.ts`:

```typescript
// Uncomment to run daily at 5:00 PM
// cron.schedule(`0 17 * * *`, async () => {
//   await handleCron();
// });
```

Current behavior: Runs once immediately on application start.

## Modifying Monitored Sources

To add/remove sources, edit the `sources` array in `src/services/getCronSources.ts`. Each source must be:
- A Twitter/X profile URL (uses RSSHub, no API key required)
- A website URL (requires `FIRECRAWL_API_KEY`)

### Adding Twitter/X Accounts

Simply add to the sources array:
```typescript
{ identifier: "https://x.com/username" }
```

The system automatically converts this to an RSSHub feed URL and filters for tweets from the last 24 hours, excluding retweets.

## AI Model Configuration

The draft generation currently uses OpenAI's `o3-mini` model in `src/services/generateDraft.ts:40-45`. The codebase has dependencies for multiple AI providers (Together AI, DeepSeek, OpenAI) but only OpenAI is actively used in the current implementation.

## Rate Limiting

- **RSSHub**: Public instance (`https://rsshub.app`) is free but may have rate limits during high traffic. Consider self-hosting for production use: https://docs.rsshub.app/deploy/
- **Firecrawl**: 429 errors are caught and logged; sources are skipped

## RSSHub Configuration

### Using Public Instance (Default)
The application uses `https://rsshub.app` by default. No configuration needed.

### Self-Hosting RSSHub
For better reliability and no rate limits:
1. Follow RSSHub deployment guide: https://docs.rsshub.app/deploy/
2. Set `RSSHUB_INSTANCE` in `.env` to your instance URL
3. Configure Twitter credentials in RSSHub for better data access (optional)

### RSSHub Parameters
The application uses these RSSHub parameters for Twitter feeds:
- `readable=1`: Better formatting
- `includeRts=0`: Exclude retweets

Additional parameters can be configured in `src/services/scrapeSources.ts:60`

## Notification Configuration

### Supported Platforms

The application supports three notification platforms:

1. **Slack** - Enterprise team communication
2. **Discord** - Community and team chat
3. **WeChat** - Via Server酱 (ServerChan), receives messages through WeChat official account

### Multi-Platform Push

Configure multiple platforms using comma-separated values:

```bash
# Single platform
NOTIFICATION_DRIVER=discord

# Multiple platforms (recommended)
NOTIFICATION_DRIVER=discord,wechat

# All platforms
NOTIFICATION_DRIVER=slack,discord,wechat
```

All notifications are sent in parallel using `Promise.allSettled()` to ensure one platform's failure doesn't affect others.

### Server酱 (WeChat) Setup

**Step 1: Register and Bind**
1. Visit https://sct.ftqq.com
2. Login with GitHub or WeChat
3. Follow the Server酱 WeChat official account
4. Complete binding

**Step 2: Get SendKey**
1. Navigate to https://sct.ftqq.com/sendkey
2. Copy your SendKey
3. Add to `.env`: `SERVERCHAN_SENDKEY=your_key_here`

**Step 3: Configure Driver**
Set `NOTIFICATION_DRIVER=wechat` or `NOTIFICATION_DRIVER=serverchan` (both work)

**API Details** (`src/services/sendDraft.ts:49-80`):
- Endpoint: `https://sctapi.ftqq.com/{SENDKEY}.send`
- Method: POST
- Params: `title` (first line of draft), `desp` (full content)

**Rate Limits**:
- 500 messages/day (free tier)
- Same content cannot be sent within 5 minutes
- Max 30 different messages per minute

