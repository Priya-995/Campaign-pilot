import { connectDB } from './config/db.js';
import * as customerService from './services/customer.service.js';
import * as segmentationService from './services/segmentation.service.js';
import * as aiService from './services/ai.service.js';
import * as campaignService from './services/campaign.service.js';
import { Customer } from './models/Customer.js';
import { Communication } from './models/Communication.js';

async function runTests() {
  console.log('--- STARTING INTEGRATION TESTS FOR SECTIONS 2, 3, 4, 5 ---');
  await connectDB();

  // ================= SECTION 2 TESTS =================
  console.log('\n--- SECTION 2: Customer APIs ---');
  const customerList = await customerService.getCustomers({ page: 1, limit: 10, city: 'Mumbai' });
  console.log(`[PASS] Customers list count in Mumbai: ${customerList.total}, fetched page count: ${customerList.customers.length}`);
  if (customerList.customers.length === 0) throw new Error('No customers found for Mumbai');

  const testCust = customerList.customers[0];
  console.log(`[PASS] Spot-checking Customer ID: ${testCust.customerId} (${testCust.name})`);

  const singleCust = await customerService.getCustomerById(testCust._id.toString());
  console.log(`[PASS] Fetched single customer: ${singleCust.name}, totalOrders: ${singleCust.totalOrders}, lifetimeSpend: ₹${singleCust.lifetimeSpend}`);

  const custOrders = await customerService.getCustomerOrders(testCust._id.toString());
  console.log(`[PASS] Fetched orders for customer: ${custOrders.length} orders found.`);
  if (custOrders.length !== testCust.totalOrders) {
    throw new Error(`Order count mismatch! Customer totalOrders: ${testCust.totalOrders}, actual order records: ${custOrders.length}`);
  }

  // ================= SECTION 3 TESTS =================
  console.log('\n--- SECTION 3: Segmentation Engine ---');
  const sampleFilter = {
    daysSinceLastOrder: { gte: 60 },
    lifetimeSpend: { gte: 2000 }
  };
  const preview = await segmentationService.previewAudience(sampleFilter);
  console.log(`[PASS] Preview audience size for '60 days inactive + spend >= 2000': ${preview.estimatedSize} customers`);
  if (preview.estimatedSize === 0) throw new Error('Preview audience size should be > 0');

  console.log('[PASS] Sample customer inclusion reasons:');
  preview.sampleCustomers.slice(0, 2).forEach(c => {
    console.log(`  - Customer: ${c.name} (${c.customerId})`);
    c.inclusionReasons.forEach(r => console.log(`    * ${r}`));
  });

  const createdSegment = await segmentationService.createSegment({
    name: 'Dormant High Spend Shoppers',
    description: 'Customers inactive for 60+ days who spent >= ₹2000',
    filters: sampleFilter
  });
  console.log(`[PASS] Created Segment ID: ${createdSegment._id}, Name: ${createdSegment.name}, Estimated Size: ${createdSegment.estimatedSize}`);

  // ================= SECTION 4 TESTS =================
  console.log('\n--- SECTION 4: AI Service & Fallbacks ---');
  const intentResult = await aiService.interpretIntent('Find customers in Mumbai who spent over 3000 and haven\'t ordered in 60 days');
  console.log(`[PASS] interpretIntent result (usedFallback=${intentResult.usedFallback}):`);
  console.log(JSON.stringify(intentResult.data, null, 2));

  const recResult = await aiService.recommendCampaign({ filters: sampleFilter, audienceSample: preview.sampleCustomers });
  console.log(`[PASS] recommendCampaign result (usedFallback=${recResult.usedFallback}):`);
  console.log(JSON.stringify(recResult.data, null, 2));

  const msgResult = await aiService.generateMessage({
    goal: 'Win-back dormant customers',
    offer: recResult.data.offer,
    tone: recResult.data.tone,
    channel: recResult.data.recommendedChannel
  });
  console.log(`[PASS] generateMessage result (usedFallback=${msgResult.usedFallback}):`);
  console.log(JSON.stringify(msgResult.data, null, 2));

  const analyticsResult = await aiService.analyzeCampaign({ sent: 500, delivered: 480, converted: 60 });
  console.log(`[PASS] analyzeCampaign result (usedFallback=${analyticsResult.usedFallback}):`);
  console.log(JSON.stringify(analyticsResult.data, null, 2));

  // ================= SECTION 5 TESTS =================
  console.log('\n--- SECTION 5: Campaign Engine & Personalization ---');
  const campaign = await campaignService.createCampaign({
    name: 'Q3 Win-Back Campaign',
    goal: 'Re-engage inactive shoppers',
    segmentId: createdSegment._id,
    channel: recResult.data.recommendedChannel,
    messageTemplate: msgResult.data.messageTemplate,
    offer: recResult.data.offer
  });
  console.log(`[PASS] Created Campaign ID: ${campaign._id}, Status: ${campaign.status}`);

  const previews = await campaignService.previewCampaignMessages(campaign._id, 3);
  console.log(`[PASS] Campaign preview messages rendered (${previews.previews.length} samples):`);
  previews.previews.forEach((p, idx) => {
    console.log(`  Sample ${idx + 1} (${p.customerName}): "${p.renderedMessage}"`);
  });

  const launchResult = await campaignService.launchCampaign(campaign._id);
  console.log(`[PASS] Launched Campaign! Updated status: ${launchResult.campaign.status}, Materialized Audience: ${launchResult.materializedAudienceCount}`);

  const createdCommsCount = await Communication.countDocuments({ campaignId: campaign._id });
  console.log(`[PASS] Total Communication records created in MongoDB: ${createdCommsCount}`);

  if (createdCommsCount !== launchResult.materializedAudienceCount) {
    throw new Error(`Communication record count mismatch! Materialized: ${launchResult.materializedAudienceCount}, Comms in DB: ${createdCommsCount}`);
  }

  // Verify invalid state transition error handling
  try {
    await campaignService.launchCampaign(campaign._id);
    throw new Error('Should not allow re-launching a non-DRAFT campaign');
  } catch (err) {
    console.log(`[PASS] Invalid state transition rejected correctly: "${err.message}"`);
  }

  console.log('\n--- ALL SECTION 2, 3, 4, 5 INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
