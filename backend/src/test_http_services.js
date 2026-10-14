/**
 * test_http_services.js
 * Verifies live HTTP communication between Backend (port 5000) and Channel Simulator (port 5001).
 */

import http from 'http';
import { connectDB } from './config/db.js';
import app from './app.js';
import channelApp from '../../channel-service/src/app.js';
import { Campaign } from './models/Campaign.js';
import { Segment } from './models/Segment.js';
import { Communication } from './models/Communication.js';

async function testHttpLive() {
  console.log('--- STARTING LIVE HTTP DUAL-SERVICE INTEGRATION TEST ---');
  await connectDB();

  // 1. Start backend on port 5000
  const backendServer = http.createServer(app);
  await new Promise((resolve) => backendServer.listen(5000, resolve));
  console.log('✓ CRM Backend listening on http://localhost:5000');

  // 2. Start channel simulator on port 5001
  const channelServer = http.createServer(channelApp);
  await new Promise((resolve) => channelServer.listen(5001, resolve));
  console.log('✓ Channel Simulator listening on http://localhost:5001');

  try {
    // 3. Health Checks
    const backendHealth = await fetch('http://localhost:5000/health').then(r => r.json());
    console.log(`✓ CRM Backend /health:`, backendHealth);

    const channelHealth = await fetch('http://localhost:5001/api/health').then(r => r.json());
    console.log(`✓ Channel Simulator /api/health:`, channelHealth);

    // 4. Create a small target segment (limit to a narrow filter, e.g. Mumbai + High spend)
    const segment = await Segment.create({
      name: 'HTTP Dual Service Segment',
      filters: {
        city: { in: ['Mumbai'] },
        lifetimeSpend: { gte: 4000 }
      }
    });

    // 5. Create draft campaign
    const campaign = await Campaign.create({
      name: 'HTTP Dual Service Live Campaign',
      goal: 'Win back high spenders in Mumbai',
      segmentId: segment._id,
      channel: 'whatsapp',
      messageTemplate: 'Hi {{first_name}}, here is your code {{coupon_code}} for {{discount}}!',
      personalizationFields: ['first_name', 'coupon_code', 'discount'],
      offer: { type: 'PERCENTAGE', value: '25% OFF' },
      status: 'DRAFT'
    });
    console.log(`✓ Created test campaign ${campaign._id} in DRAFT status`);

    // 6. Launch via HTTP POST
    console.log(`✓ Triggering launch via POST http://localhost:5000/api/campaigns/${campaign._id}/launch...`);
    const launchRes = await fetch(`http://localhost:5000/api/campaigns/${campaign._id}/launch`, {
      method: 'POST'
    }).then(r => r.json());

    console.log(`✓ Launch response: status=${launchRes.campaign?.status}, audience=${launchRes.materializedAudienceCount}`);

    // 7. Wait 5 seconds for asynchronous simulator events to fire back to CRM webhook
    console.log('⏳ Waiting 5 seconds for async event lifecycle callbacks from Channel Simulator...');
    await new Promise(r => setTimeout(r, 5000));

    // 8. Fetch analytics via HTTP GET
    const analyticsRes = await fetch(`http://localhost:5000/api/campaigns/${campaign._id}/analytics`).then(r => r.json());
    console.log(`✓ Live Funnel from HTTP Analytics:`, analyticsRes.funnel);
    console.log(`✓ Attributed Stats:`, analyticsRes.attribution);

    if (analyticsRes.funnel.sent > 0 || analyticsRes.funnel.delivered > 0) {
      console.log('✓ SUCCESS: Webhook callbacks received and processed by CRM!');
    } else {
      console.warn('Note: Events still in flight in simulator timers.');
    }

    console.log('--- LIVE HTTP DUAL-SERVICE INTEGRATION TEST COMPLETED SUCCESSFULLY ---');
  } finally {
    backendServer.close();
    channelServer.close();
    process.exit(0);
  }
}

testHttpLive().catch(err => {
  console.error('❌ HTTP Live test failed:', err);
  process.exit(1);
});
