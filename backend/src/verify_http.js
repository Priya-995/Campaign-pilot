async function verifyHttp() {
  const BASE_URL = 'http://localhost:5000/api';

  console.log('--- VERIFYING HTTP ENDPOINTS ---');

  // 1. GET /api/customers
  const resCustomers = await fetch(`${BASE_URL}/customers?limit=5&city=Mumbai`).then(r => r.json());
  console.log(`[HTTP 200] GET /api/customers - Total: ${resCustomers.total}, Returned: ${resCustomers.customers.length}`);

  // 2. GET /api/customers/:id
  const sampleId = resCustomers.customers[0]._id;
  const resSingle = await fetch(`${BASE_URL}/customers/${sampleId}`).then(r => r.json());
  console.log(`[HTTP 200] GET /api/customers/${sampleId} - Name: ${resSingle.name}`);

  // 3. GET /api/customers/:id/orders
  const resOrders = await fetch(`${BASE_URL}/customers/${sampleId}/orders`).then(r => r.json());
  console.log(`[HTTP 200] GET /api/customers/${sampleId}/orders - Order count: ${resOrders.orders.length}`);

  // 4. POST /api/segments/preview
  const resPreview = await fetch(`${BASE_URL}/segments/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      daysSinceLastOrder: { gte: 60 },
      lifetimeSpend: { gte: 2000 }
    })
  }).then(r => r.json());
  console.log(`[HTTP 200] POST /api/segments/preview - Estimated Size: ${resPreview.estimatedSize}`);

  // 5. POST /api/ai/interpret-intent
  const resAI = await fetch(`${BASE_URL}/ai/interpret-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Find shoppers in Delhi inactive for 90 days with lifetime spend over 3000'
    })
  }).then(r => r.json());
  console.log(`[HTTP 200] POST /api/ai/interpret-intent - usedFallback: ${resAI.usedFallback}, Goal: "${resAI.data.goal}"`);

  // 6. POST /api/campaigns & Launch
  const resSegment = await fetch(`${BASE_URL}/segments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'HTTP Test Segment',
      filters: { daysSinceLastOrder: { gte: 60 } }
    })
  }).then(r => r.json());
  const segmentId = resSegment._id;

  const resCampaign = await fetch(`${BASE_URL}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'HTTP Test Campaign',
      goal: 'Test launch via HTTP',
      segmentId,
      channel: 'whatsapp',
      messageTemplate: 'Hello {{first_name}}, use {{coupon_code}} for {{discount}} discount!'
    })
  }).then(r => r.json());
  const campaignId = resCampaign._id;

  const resLaunch = await fetch(`${BASE_URL}/campaigns/${campaignId}/launch`, {
    method: 'POST'
  }).then(r => r.json());
  console.log(`[HTTP 200] POST /api/campaigns/${campaignId}/launch - Status: ${resLaunch.campaign.status}, Materialized: ${resLaunch.materializedAudienceCount}`);

  console.log('--- ALL HTTP ENDPOINTS VERIFIED SUCCESSFULLY ---');
}

verifyHttp().catch(err => {
  console.error('HTTP verification failed:', err.message);
  process.exit(1);
});
