import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';

export async function getCustomers({
  page = 1,
  limit = 20,
  city,
  category,
  preferredChannel,
  sortBy = 'lastOrderAt',
  sortOrder = 'desc'
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const query = {};

  // Whitelisted filtering
  if (city) {
    query.city = Array.isArray(city) ? { $in: city } : city;
  }
  if (category) {
    query.categories = Array.isArray(category) ? { $in: category } : category;
  }
  if (preferredChannel) {
    query.preferredChannel = Array.isArray(preferredChannel) ? { $in: preferredChannel } : preferredChannel;
  }

  // Whitelisted sorting
  const allowedSortFields = ['lastOrderAt', 'lifetimeSpend', 'totalOrders', 'createdAt'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'lastOrderAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Customer.countDocuments(query)
  ]);

  return {
    customers,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
}

export async function getCustomerById(id) {
  let customer;
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    customer = await Customer.findById(id).lean();
  }
  if (!customer) {
    customer = await Customer.findOne({ customerId: id }).lean();
  }
  return customer;
}

export async function getCustomerOrders(id) {
  const customer = await getCustomerById(id);
  if (!customer) {
    return null;
  }
  const orders = await Order.find({ customerId: customer._id })
    .sort({ orderedAt: -1 })
    .lean();
  return orders;
}
