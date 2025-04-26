import Stripe from 'stripe';
import config from './config.js';

class StripeService {
  constructor() {
    this.stripe = new Stripe(config.stripe.apiKey);
    this.mrrCache = new Map();
  }

  async getDailyMetrics() {
    try {
      const mrr = await this.getMonthlyRecurringRevenue();
      const churnRate = await this.getChurnRate();
      const newCustomers = await this.getNewCustomers();
      const mrrGrowthRate = await this.getMRRGrowthRate();

      return {
        mrr,
        churnRate,
        newCustomers,
        mrrGrowthRate,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting Stripe metrics:', error);
      throw error;
    }
  }

  async getMonthlyRecurringRevenue() {
    return this.calculateMRR();
  }

  async getChurnRate() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let activeSubsCount = 0;
    let churnedSubsCount = 0;
    let newSubsCount = 0;

    // Get active subscriptions as of 30 days ago using search
    const activeSubs = await this.stripe.subscriptions.search({
      query: `status:'active' AND created<${Math.floor(thirtyDaysAgo.getTime() / 1000)}`,
      limit: 100
    });
    activeSubsCount = activeSubs.data.length;

    // Get subscriptions that were canceled in the last 30 days using search
    const churnedSubs = await this.stripe.subscriptions.search({
      query: `status:'canceled' AND canceled_at>${Math.floor(thirtyDaysAgo.getTime() / 1000)} AND canceled_at<${Math.floor(now.getTime() / 1000)}`,
      limit: 100
    });
    churnedSubsCount = churnedSubs.data.length;

    // Get new subscriptions in the last 30 days using search
    const newSubs = await this.stripe.subscriptions.search({
      query: `created>${Math.floor(thirtyDaysAgo.getTime() / 1000)} AND created<${Math.floor(now.getTime() / 1000)}`,
      limit: 100
    });
    newSubsCount = newSubs.data.length;

    const denominator = activeSubsCount + newSubsCount;
    if (denominator === 0) return 0;

    const churnRate = (churnedSubsCount / denominator) * 100;
    return churnRate;
  }

  async getNewCustomers() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get customers created this month using search
    const newCustomers = await this.stripe.customers.search({
      query: `created>${Math.floor(firstDayOfMonth.getTime() / 1000)} AND created<${Math.floor(now.getTime() / 1000)}`,
      limit: 100
    });

    return newCustomers.data.length;
  }

  async getMRRGrowthRate() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const currentMRR = await this.calculateMRR();
    const previousMRR = await this.calculateMRR(thirtyDaysAgo);

    if (previousMRR === 0) return 0;
    const growthRate = ((currentMRR - previousMRR) / previousMRR) * 100;
    return growthRate;
  }

  async calculateMRR(asOfDate = null) {
    // Generate cache key based on the date
    const cacheKey = asOfDate ? asOfDate.getTime() : 'current';
    const cachedResult = this.mrrCache.get(cacheKey);

    // Check if we have a valid cached result
    if (cachedResult && cachedResult.timestamp > Date.now() - 3600000) { // 1 hour cache
      return cachedResult.value;
    }

    let totalMRR = 0;

    const params = {
      limit: 100,
      expand: ['data.plan', 'data.discount', 'data.default_tax_rates']
    };

    // If asOfDate is provided, only look at subscriptions created before that date
    if (asOfDate) {
      params.created = { lte: Math.floor(asOfDate.getTime() / 1000) };
    }

    // Use auto-pagination to get all active subscriptions
    for await (const subscription of this.stripe.subscriptions.list(params)) {
      // Skip subscriptions in trial period
      if (subscription.status === 'trialing') continue;

      // Get the base amount from the subscription
      const baseAmount = subscription.plan?.amount || 0;
      const quantity = subscription.quantity || 1;
      const interval = subscription.plan?.interval;
      const intervalCount = subscription.plan?.interval_count || 1;

      // Calculate the monthly normalized amount
      let monthlyAmount = baseAmount;
      if (interval === 'year') {
        monthlyAmount = baseAmount / 12;
      } else if (interval === 'week') {
        monthlyAmount = baseAmount * 52 / 12;
      } else if (interval === 'day') {
        monthlyAmount = baseAmount * 365 / 12;
      } else if (interval === 'month' && intervalCount > 1) {
        monthlyAmount = baseAmount / intervalCount;
      }

      // Apply quantity
      let totalAmount = monthlyAmount * quantity;

      // Apply discounts if any
      if (subscription.discount) {
        const discount = subscription.discount.coupon;
        if (discount.percent_off) {
          totalAmount = totalAmount * (1 - discount.percent_off / 100);
        } else if (discount.amount_off) {
          // Convert the discount to monthly if it's not already
          let monthlyDiscount = discount.amount_off;
          if (discount.duration === 'forever' || discount.duration === 'once') {
            monthlyDiscount = discount.amount_off;
          } else if (discount.duration === 'repeating') {
            monthlyDiscount = discount.amount_off / discount.duration_in_months;
          }
          totalAmount = Math.max(0, totalAmount - monthlyDiscount);
        }
      }

      // Add tax if applicable
      if (subscription.default_tax_rates && subscription.default_tax_rates.length > 0) {
        const taxRate = subscription.default_tax_rates[0].percentage;
        totalAmount = totalAmount * (1 + taxRate / 100);
      }

      // Convert to dollars from cents
      totalMRR += totalAmount / 100;
    }

    // Cache the result with timestamp
    this.mrrCache.set(cacheKey, {
      value: totalMRR,
      timestamp: Date.now()
    });

    return totalMRR;
  }
}

export default new StripeService();
