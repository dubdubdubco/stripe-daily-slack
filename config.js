import dotenv from 'dotenv';
dotenv.config();

export default {
  stripe: {
    apiKey: process.env.STRIPE_API_KEY
  },
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    channelId: process.env.SLACK_CHANNEL_ID
  },
  timezone: process.env.TIMEZONE || 'America/New_York'
};
