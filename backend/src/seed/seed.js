import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';

dotenv.config();

const CITIES = ['Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad'];
const CHANNELS = ['whatsapp', 'sms', 'email', 'rcs'];
const CATEGORIES = ['beauty', 'fashion', 'electronics', 'grocery', 'home'];
const GENDERS = ['female', 'male', 'other'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function runSeed() {
  await connectDB();

  console.log('[SEED] Starting seed script...');
  await Customer.deleteMany({});
  await Order.deleteMany({});
  console.log('[SEED] Cleared existing Customer and Order collections.');

  // Configurable seed count (default: 500 customers for lightweight Atlas free tier)
  const TOTAL_CUSTOMERS = parseInt(process.env.SEED_CUSTOMERS || '500', 10);
  const customersToInsert = [];
  const ordersToInsert = [];

  const now = new Date();

  // Define archetypes ratios:
  // 0: High-Value Loyal (~20%)
  // 1: Dormant/Inactive (~25%)
  // 2: New Customers (~20%)
  // 3: Frequent-Low-Spend (~15%)
  // 4: Category-Loyal (~20%)

  for (let i = 1; i <= TOTAL_CUSTOMERS; i++) {
    const custId = `CUST-${String(i).padStart(6, '0')}`;
    const gender = getRandomItem(GENDERS);
    const firstName = faker.person.firstName(gender === 'other' ? 'female' : gender);
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.in`;
    const phone = `+91${getRandomInt(6000000000, 9999999999)}`;
    const city = getRandomItem(CITIES);
    const preferredChannel = getRandomItem(CHANNELS);

    const customerObjectId = new mongoose.Types.ObjectId();

    // Determine archetype based on index
    const archetypeChoice = i % 5;
    let orderCount = 1;
    let minDaysAgo = 1;
    let maxDaysAgo = 365;
    let minAmount = 200;
    let maxAmount = 2000;
    let categoryPreference = null;

    if (archetypeChoice === 0) {
      // High-value loyal
      orderCount = getRandomInt(6, 12);
      minDaysAgo = 2;
      maxDaysAgo = 25;
      minAmount = 1500;
      maxAmount = 5000;
    } else if (archetypeChoice === 1) {
      // Dormant/Inactive (60 to 180+ days since last order)
      orderCount = getRandomInt(2, 6);
      minDaysAgo = 65;
      maxDaysAgo = 240;
      minAmount = 500;
      maxAmount = 3000;
    } else if (archetypeChoice === 2) {
      // New Customer
      orderCount = 1;
      minDaysAgo = 1;
      maxDaysAgo = 14;
      minAmount = 300;
      maxAmount = 2500;
    } else if (archetypeChoice === 3) {
      // Frequent but low spend
      orderCount = getRandomInt(5, 10);
      minDaysAgo = 5;
      maxDaysAgo = 90;
      minAmount = 100;
      maxAmount = 400;
    } else {
      // Category loyal
      orderCount = getRandomInt(3, 8);
      minDaysAgo = 10;
      maxDaysAgo = 120;
      minAmount = 400;
      maxAmount = 3500;
      categoryPreference = getRandomItem(CATEGORIES);
    }

    let customerLifetimeSpend = 0;
    let firstOrderAt = null;
    let lastOrderAt = null;
    const customerCategoriesSet = new Set();

    for (let o = 0; o < orderCount; o++) {
      const orderObjectId = new mongoose.Types.ObjectId();
      const orderCustomId = `ORD-${i}-${o + 1}-${getRandomInt(100, 999)}`;
      const amount = getRandomInt(minAmount, maxAmount);
      const category = categoryPreference || getRandomItem(CATEGORIES);
      const channel = getRandomItem(['web', 'app', 'whatsapp', 'email']);

      // Generate order date spread between minDaysAgo and maxDaysAgo
      const daysAgo = getRandomInt(minDaysAgo, maxDaysAgo);
      const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - getRandomInt(0, 86400) * 1000);

      customerLifetimeSpend += amount;
      customerCategoriesSet.add(category);

      if (!firstOrderAt || orderDate < firstOrderAt) firstOrderAt = orderDate;
      if (!lastOrderAt || orderDate > lastOrderAt) lastOrderAt = orderDate;

      ordersToInsert.push({
        _id: orderObjectId,
        orderId: orderCustomId,
        customerId: customerObjectId,
        customerCustomId: custId,
        amount,
        category,
        channel,
        status: 'COMPLETED',
        orderedAt: orderDate
      });
    }

    customersToInsert.push({
      _id: customerObjectId,
      customerId: custId,
      name,
      email,
      phone,
      city,
      gender,
      preferredChannel,
      totalOrders: orderCount,
      lifetimeSpend: customerLifetimeSpend,
      firstOrderAt,
      lastOrderAt,
      categories: Array.from(customerCategoriesSet)
    });
  }

  // Batch insert customers
  const BATCH_SIZE = 1000;
  for (let i = 0; i < customersToInsert.length; i += BATCH_SIZE) {
    const chunk = customersToInsert.slice(i, i + BATCH_SIZE);
    await Customer.insertMany(chunk);
    console.log(`[SEED] Inserted ${i + chunk.length} / ${customersToInsert.length} customers...`);
  }

  // Batch insert orders
  for (let i = 0; i < ordersToInsert.length; i += BATCH_SIZE) {
    const chunk = ordersToInsert.slice(i, i + BATCH_SIZE);
    await Order.insertMany(chunk);
    console.log(`[SEED] Inserted ${i + chunk.length} / ${ordersToInsert.length} orders...`);
  }

  console.log(`[SEED] Seed completed successfully! Total Customers: ${customersToInsert.length}, Total Orders: ${ordersToInsert.length}`);
}

// If executed directly
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED] Seed failed:', err);
      process.exit(1);
    });
}
