const { WebClient } = require('@slack/web-api');
const config = require('./config');

class SlackService {
  constructor() {
    this.client = new WebClient(config.slack.botToken);
    this.channelId = config.slack.channelId;
  }

  async sendMetricsReport(metrics) {
    try {
      const formattedMRR = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(metrics.mrr);

      const formattedChurnRate = metrics.churnRate.toFixed(2);
      const date = new Date(metrics.timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const message = {
        channel: this.channelId,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `📊 Stripe Daily Metrics Report - ${date}`,
              emoji: true
            }
          },
          {
            type: 'divider'
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*MRR:*\n${formattedMRR}`
              },
              {
                type: 'mrkdwn',
                text: `*Churn Rate:*\n${formattedChurnRate}%`
              }
            ]
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*New Customers This Month:*\n${metrics.newCustomers}`
              }
            ]
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `_Report generated at ${new Date(metrics.timestamp).toLocaleTimeString()}_`
              }
            ]
          }
        ]
      };

      const result = await this.client.chat.postMessage(message);
      console.log('Message sent to Slack successfully');
      return result;
    } catch (error) {
      console.error('Error sending message to Slack:', error);
      throw error;
    }
  }
}

module.exports = new SlackService();
