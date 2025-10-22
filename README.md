# Trend Finder 🔦

**Stay on top of trending topics on social media — all in one place.**

Trend Finder collects and analyzes posts from key influencers, then sends a Slack or Discord notification when it detects new trends or product launches. This has been a complete game-changer for the Firecrawl marketing team by:

- **Saving time** normally spent manually searching social channels
- **Keeping you informed** of relevant, real-time conversations
- **Enabling rapid response** to new opportunities or emerging industry shifts

_Spend less time hunting for trends and more time creating impactful campaigns._

## Watch the Demo & Tutorial video

[![Thumbnail](https://i.ytimg.com/vi/puimQSun92g/hqdefault.jpg)](https://www.youtube.com/watch?v=puimQSun92g)

Learn how to set up Trend Finder and start monitoring trends in this video!

## How it Works

1. **Data Collection** 📥
   - Monitors selected influencers' posts on Twitter/X using RSSHub (free, no API key required)
   - Monitors websites for new releases and news with Firecrawl's /extract
   - Runs on a scheduled basis using cron jobs

2. **AI Analysis** 🧠
   - Processes collected content through Together AI
   - Identifies emerging trends, releases, and news.
   - Analyzes sentiment and relevance

3. **Notification System** 📢
   - When significant trends are detected, sends Slack or Discord notifications based on cron job setup
   - Provides context about the trend and its sources
   - Enables quick response to emerging opportunities

## Features

- 🤖 AI-powered trend analysis using Together AI
- 📱 Social media monitoring (Twitter/X via RSSHub - no API key needed)
- 🔍 Website monitoring with Firecrawl
- 💬 Multi-platform notifications: Slack, Discord, and WeChat (via Server酱)
- ⏱️ Scheduled monitoring using cron jobs
- 🔔 Support for simultaneous push to multiple platforms

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Docker
- Docker Compose
- Slack workspace with webhook permissions
- API keys for required services

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```
# Optional: API key from Together AI for trend analysis (https://www.together.ai/)
TOGETHER_API_KEY=your_together_api_key_here

# Optional: API key from DeepSeek for trend analysis (https://deepseek.com/)
DEEPSEEK_API_KEY=

# Optional: API key from OpenAI for trend analysis (https://openai.com/)
OPENAI_API_KEY=

# Required if monitoring web pages (https://www.firecrawl.dev/)
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# Optional: RSSHub instance URL for Twitter/X monitoring (defaults to https://rsshub.app)
# You can use the public instance or self-host your own: https://docs.rsshub.app/
RSSHUB_INSTANCE=https://rsshub.app

# Notification driver. Supported drivers: "slack", "discord", "wechat" (or "serverchan")
# You can specify multiple drivers separated by comma, e.g., "discord,wechat" to push to multiple platforms
NOTIFICATION_DRIVER=discord

# Required (if NOTIFICATION_DRIVER includes "slack"): Incoming Webhook URL from Slack for notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Required (if NOTIFICATION_DRIVER includes "discord"): Incoming Webhook URL from Discord for notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/WEBHOOK/URL

# Required (if NOTIFICATION_DRIVER includes "wechat" or "serverchan"): SendKey from Server酱
# Get your SendKey at https://sct.ftqq.com/sendkey
SERVERCHAN_SENDKEY=your_serverchan_sendkey_here
```

### Multi-Platform Notifications

You can configure notifications to be sent to multiple platforms simultaneously:

- **Single platform**: `NOTIFICATION_DRIVER=discord`
- **Multiple platforms**: `NOTIFICATION_DRIVER=discord,wechat` (will send to both Discord and WeChat)
- **All platforms**: `NOTIFICATION_DRIVER=slack,discord,wechat`

#### WeChat Setup (via Server酱)

1. Visit [Server酱官网](https://sct.ftqq.com)
2. Login with GitHub or WeChat
3. Follow WeChat official account and bind
4. Get your SendKey from [https://sct.ftqq.com/sendkey](https://sct.ftqq.com/sendkey)
5. Add SendKey to `.env` file as `SERVERCHAN_SENDKEY`

**Free Tier Limits**: 500 messages per day

## Getting Started

### Option 1: Deploy with GitHub Actions (Recommended ⭐)

**Completely free, zero maintenance!**

1. **Fork or clone the repository:**
   ```bash
   git clone [repository-url]
   cd trend-finder
   ```

2. **Push to your GitHub repository:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/trend-finder.git
   git push -u origin main
   ```

3. **Configure GitHub Secrets:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `DEEPSEEK_API_KEY`: Your DeepSeek API key
     - `RSSHUB_INSTANCE`: Your RSSHub instance URL
     - `SERVERCHAN_SENDKEY`: Your Server酱 SendKey

4. **Done!** The workflow will run automatically every day at 5:00 PM Beijing time.

📖 **Detailed guide:** See [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md)

---

### Option 2: Local Development

1. **Clone the repository:**
   ```bash
   git clone [repository-url]
   cd trend-finder
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application:**
   ```bash
   # Development mode with hot reloading
   npm run start

   # Build for production
   npm run build
   ```

---

### Option 3: Deploy with Railway

**Good for running 24/7 services**

1. Visit [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Configure environment variables
4. Deploy!

**Note:** Railway has a $5/month free tier, which is sufficient for this project.

---

### Option 4: Using Docker

1. **Build the Docker image:**
   ```bash
   docker build -t trend-finder .
   ```

2. **Run the Docker container:**
   ```bash
   docker run -d -p 3000:3000 --env-file .env trend-finder
   ```

## Using Docker Compose

1. **Start the application with Docker Compose:**
   ```bash
   docker-compose up --build -d
   ```

2. **Stop the application with Docker Compose:**
   ```bash
   docker-compose down
   ```

## Project Structure

```
trend-finder/
├── src/
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   └── index.ts        # Application entry point
├── .env.example        # Environment variables template
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
