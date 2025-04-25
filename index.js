const cron = require('node-cron');
const stripeService = require('./stripe-service');
const slackService = require('./slack-service');
const config = require('./config');

// Function to fetch Stripe metrics and send them to Slack
async function sendDailyReport() {
  console.log('Starting daily Stripe metrics report...');

  try {
    // Get metrics from Stripe
    const metrics = await stripeService.getDailyMetrics();
    console.log('Retrieved Stripe metrics');

    // Send metrics to Slack
    await slackService.sendMetricsReport(metrics);
    console.log('Daily Stripe metrics report completed successfully');
  } catch (error) {
    console.error('Error in daily Stripe metrics report:', error);
    process.exit(1); // Exit with non-zero status code on error
  }
}

if (process.argv.includes('--run-now')) {
  // Run immediately if requested via command line flag
  console.log('Running metrics report immediately...');
  sendDailyReport();
} else {
  // Schedule the job to run daily at 9:00 AM in the specified timezone
  cron.schedule('0 9 * * *', sendDailyReport, {
    scheduled: true,
    timezone: config.timezone
  });

  console.log(`Stripe Daily Slack Reporter started. Scheduled to run daily at 9:00 AM ${config.timezone}.`);
}
