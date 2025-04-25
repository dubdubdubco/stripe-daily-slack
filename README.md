# Stripe Daily Slack Reporter

A simple application that sends daily Stripe metrics to a Slack channel.

## Features

- Reports Monthly Recurring Revenue (MRR)
- Reports customer churn rate
- Reports new customers acquired this month
- Sends a beautifully formatted message to a Slack channel
- Runs automatically every day at 9:00 AM

## Prerequisites

- Node.js 14 or higher
- A Stripe account with API access
- A Slack workspace with permission to create a bot

## Setup

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/stripe-daily-slack.git
cd stripe-daily-slack
```

2. **Install dependencies:**

```bash
npm install
```

3. **Create a `.env` file:**

Copy the `.env.example` file to `.env` and fill in your Stripe API key and Slack bot token and channel ID.

```
# Stripe API Key
STRIPE_API_KEY=your_stripe_api_key_here

# Slack Bot Token and Channel ID
SLACK_BOT_TOKEN=your_slack_bot_token_here
SLACK_CHANNEL_ID=your_slack_channel_id_here

# Timezone for scheduling (optional)
TIMEZONE=America/New_York
```

### Getting the Stripe API Key

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Developers > API keys
3. Copy either the publishable key or the secret key (use secret key for production)

### Creating a Slack Bot and Getting Tokens

1. Go to [Slack API](https://api.slack.com/apps)
1. Click "Create New App" and select "From scratch"
1. Give your app a name and select your workspace
1. Navigate to "OAuth & Permissions" and add the following scopes:
   - `chat:write`
   - `channels:read`
1. Install the app to your workspace
1. Copy the "Bot User OAuth Token" that starts with `xoxb-`
1. Find your channel ID by right-clicking on the channel in Slack and selecting "Copy Link"

Note: For private channels, you need to add the bot to the channel first using `/invite @your-bot-name`.

## Usage

Start the application:

```bash
node index.js
```

The application will run as a daemon and send reports daily at 9:00 AM in the specified timezone.

To test the application immediately:

```bash
node index.js --run-now
```

## Deployment

For production use, this repo is setup with a GitHub Actions workflow that runs daily at 9:00 AM. You simply need to configure the `STRIPE_API_KEY` and `SLACK_BOT_TOKEN` secrets, and `SLACK_CHANNEL_ID` variable.

Alternatively, you can consider using a process manager like PM2:

```bash
npm install -g pm2
pm2 start index.js --name stripe-daily-slack
pm2 save
```

## License

MIT
