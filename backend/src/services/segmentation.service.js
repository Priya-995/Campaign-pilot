import { Customer } from '../models/Customer.js';
import { Segment } from '../models/Segment.js';

export function buildMongoQuery(filters = {}) {
  const query = {};
  const now = new Date();

  // daysSinceLastOrder
  // gte: 60 -> lastOrderAt <= now - 60 days
  // lte: 30 -> lastOrderAt >= now - 30 days
  if (filters.daysSinceLastOrder) {
    const lastOrderCondition = {};
    if (typeof filters.daysSinceLastOrder.gte === 'number') {
      const maxDate = new Date(now.getTime() - filters.daysSinceLastOrder.gte * 24 * 60 * 60 * 1000);
      lastOrderCondition.$lte = maxDate;
    }
    if (typeof filters.daysSinceLastOrder.lte === 'number') {
      const minDate = new Date(now.getTime() - filters.daysSinceLastOrder.lte * 24 * 60 * 60 * 1000);
      lastOrderCondition.$gte = minDate;
    }
    if (Object.keys(lastOrderCondition).length > 0) {
      query.lastOrderAt = lastOrderCondition;
    }
  }

  // lifetimeSpend
  if (filters.lifetimeSpend) {
    const spendCondition = {};
    if (typeof filters.lifetimeSpend.gte === 'number') spendCondition.$gte = filters.lifetimeSpend.gte;
    if (typeof filters.lifetimeSpend.lte === 'number') spendCondition.$lte = filters.lifetimeSpend.lte;
    if (Object.keys(spendCondition).length > 0) {
      query.lifetimeSpend = spendCondition;
    }
  }

  // totalOrders
  if (filters.totalOrders) {
    const ordersCondition = {};
    if (typeof filters.totalOrders.gte === 'number') ordersCondition.$gte = filters.totalOrders.gte;
    if (typeof filters.totalOrders.lte === 'number') ordersCondition.$lte = filters.totalOrders.lte;
    if (Object.keys(ordersCondition).length > 0) {
      query.totalOrders = ordersCondition;
    }
  }

  // categories
  if (filters.categories && Array.isArray(filters.categories.in) && filters.categories.in.length > 0) {
    query.categories = { $in: filters.categories.in };
  }

  // city
  if (filters.city && Array.isArray(filters.city.in) && filters.city.in.length > 0) {
    query.city = { $in: filters.city.in };
  }

  // preferredChannel
  if (filters.preferredChannel && Array.isArray(filters.preferredChannel.in) && filters.preferredChannel.in.length > 0) {
    query.preferredChannel = { $in: filters.preferredChannel.in };
  }

  // hasPurchased
  if (typeof filters.hasPurchased === 'boolean') {
    if (filters.hasPurchased) {
      query.totalOrders = { ...query.totalOrders, $gt: 0 };
    } else {
      query.totalOrders = 0;
    }
  }

  return query;
}

export function explainInclusion(customer, filters = {}) {
  const reasons = [];

  if (filters.daysSinceLastOrder && customer.lastOrderAt) {
    const daysAgo = Math.floor((new Date().getTime() - new Date(customer.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24));
    if (typeof filters.daysSinceLastOrder.gte === 'number' && daysAgo >= filters.daysSinceLastOrder.gte) {
      reasons.push(`Last purchase was ${daysAgo} days ago (≥ ${filters.daysSinceLastOrder.gte} days ago)`);
    }
    if (typeof filters.daysSinceLastOrder.lte === 'number' && daysAgo <= filters.daysSinceLastOrder.lte) {
      reasons.push(`Last purchase was ${daysAgo} days ago (≤ ${filters.daysSinceLastOrder.lte} days ago)`);
    }
  }

  if (filters.lifetimeSpend) {
    const spend = customer.lifetimeSpend || 0;
    if (typeof filters.lifetimeSpend.gte === 'number' && spend >= filters.lifetimeSpend.gte) {
      reasons.push(`Lifetime spend is ₹${spend.toLocaleString()} (≥ ₹${filters.lifetimeSpend.gte.toLocaleString()})`);
    }
    if (typeof filters.lifetimeSpend.lte === 'number' && spend <= filters.lifetimeSpend.lte) {
      reasons.push(`Lifetime spend is ₹${spend.toLocaleString()} (≤ ₹${filters.lifetimeSpend.lte.toLocaleString()})`);
    }
  }

  if (filters.totalOrders) {
    const orders = customer.totalOrders || 0;
    if (typeof filters.totalOrders.gte === 'number' && orders >= filters.totalOrders.gte) {
      reasons.push(`Total orders: ${orders} (≥ ${filters.totalOrders.gte})`);
    }
    if (typeof filters.totalOrders.lte === 'number' && orders <= filters.totalOrders.lte) {
      reasons.push(`Total orders: ${orders} (≤ ${filters.totalOrders.lte})`);
    }
  }

  if (filters.categories?.in?.length > 0) {
    const matched = (customer.categories || []).filter(c => filters.categories.in.includes(c));
    if (matched.length > 0) {
      reasons.push(`Purchased in matching category: ${matched.join(', ')}`);
    }
  }

  if (filters.city?.in?.length > 0 && filters.city.in.includes(customer.city)) {
    reasons.push(`Located in ${customer.city}`);
  }

  if (filters.preferredChannel?.in?.length > 0 && filters.preferredChannel.in.includes(customer.preferredChannel)) {
    reasons.push(`Preferred channel is ${customer.preferredChannel}`);
  }

  if (reasons.length === 0) {
    reasons.push(`Customer matches all default segment conditions`);
  }

  return reasons;
}

export async function previewAudience(filters = {}) {
  const query = buildMongoQuery(filters);
  const [estimatedSize, sampleCustomersRaw] = await Promise.all([
    Customer.countDocuments(query),
    Customer.find(query).limit(5).lean()
  ]);

  const sampleCustomers = sampleCustomersRaw.map(customer => ({
    ...customer,
    inclusionReasons: explainInclusion(customer, filters)
  }));

  return {
    estimatedSize,
    sampleCustomers
  };
}

export async function createSegment({ name, description, filters }) {
  const preview = await previewAudience(filters);
  const segment = new Segment({
    name,
    description: description || '',
    filters,
    estimatedSize: preview.estimatedSize
  });
  await segment.save();
  return segment;
}

export async function getSegments() {
  return Segment.find().sort({ createdAt: -1 }).lean();
}

export async function getSegmentById(id) {
  return Segment.findById(id).lean();
}
