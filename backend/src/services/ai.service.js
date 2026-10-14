import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { AIInteraction } from '../models/AIInteraction.js';
import {
  interpretIntentSchema,
  recommendCampaignSchema,
  generateMessageSchema,
  analyzeCampaignSchema
} from '../utils/validators/ai.schemas.js';

dotenv.config();

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('your_groq_api_key') || apiKey.trim() === '') {
    return null;
  }
  return new Groq({ apiKey });
}

function cleanJsonResponse(rawText) {
  if (!rawText) return '';
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
  return cleaned.trim();
}

async function logInteraction(capability, inputPrompt, rawOutput, parsedOutput, usedFallback) {
  try {
    const interaction = new AIInteraction({
      capability,
      inputPrompt,
      rawOutput: rawOutput || '',
      parsedOutput: parsedOutput || {},
      usedFallback
    });
    await interaction.save();
  } catch (err) {
    console.warn('[AI Service] Log interaction warning:', err.message);
  }
}

// ================= FALLBACK LOGIC =================

function interpretIntentFallback(text = '') {
  const lower = text.toLowerCase();
  const filters = {};
  let goal = `Segment based on prompt: "${text}"`;

  // Inactive / dormant
  const daysMatch = lower.match(/(\d+)\s*days/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    filters.daysSinceLastOrder = { gte: days };
    goal = `Re-engage customers inactive for ${days}+ days`;
  } else if (lower.includes('inactive') || lower.includes('dormant')) {
    filters.daysSinceLastOrder = { gte: 60 };
    goal = 'Re-engage dormant shoppers';
  }

  // Spend
  const spendMatch = lower.match(/(?:spent|spend|over|>|greater than|at least)\s*₹?\s*(\d+)/i);
  if (spendMatch) {
    const amount = parseInt(spendMatch[1], 10);
    filters.lifetimeSpend = { gte: amount };
  } else if (lower.includes('high spend') || lower.includes('vip') || lower.includes('high value')) {
    filters.lifetimeSpend = { gte: 5000 };
  }

  // Orders
  const ordersMatch = lower.match(/(\d+)\s*\+?\s*orders?/i);
  if (ordersMatch) {
    const orders = parseInt(ordersMatch[1], 10);
    filters.totalOrders = { gte: orders };
  }

  // Categories
  const availableCategories = ['beauty', 'fashion', 'electronics', 'grocery', 'home'];
  const matchedCategories = availableCategories.filter(c => lower.includes(c));
  if (matchedCategories.length > 0) {
    filters.categories = { in: matchedCategories };
  }

  // Cities
  const availableCities = ['mumbai', 'bengaluru', 'delhi', 'hyderabad', 'pune', 'chennai', 'kolkata', 'ahmedabad'];
  const matchedCities = availableCities.filter(c => lower.includes(c));
  if (matchedCities.length > 0) {
    filters.city = { in: matchedCities.map(c => c.charAt(0).toUpperCase() + c.slice(1)) };
  }

  // Channels
  const availableChannels = ['whatsapp', 'sms', 'email', 'rcs'];
  const matchedChannels = availableChannels.filter(ch => lower.includes(ch));
  if (matchedChannels.length > 0) {
    filters.preferredChannel = { in: matchedChannels };
  }

  return { goal, filters };
}

function recommendCampaignFallback({ filters, audienceSample = [] }) {
  let recommendedChannel = 'whatsapp';
  if (filters?.preferredChannel?.in?.length > 0) {
    recommendedChannel = filters.preferredChannel.in[0];
  } else if (audienceSample.length > 0) {
    const channelCounts = {};
    audienceSample.forEach(c => {
      channelCounts[c.preferredChannel] = (channelCounts[c.preferredChannel] || 0) + 1;
    });
    const topChannel = Object.keys(channelCounts).sort((a, b) => channelCounts[b] - channelCounts[a])[0];
    if (topChannel) recommendedChannel = topChannel;
  }

  return {
    recommendedChannel,
    reason: `Selected ${recommendedChannel.toUpperCase()} as it provides optimal engagement for this target segment based on historic response rates.`,
    offer: {
      type: 'PERCENTAGE',
      value: '20% OFF'
    },
    tone: 'friendly & persuasive'
  };
}

function generateMessageFallback({ goal, offer, tone, channel, personalizationFields }) {
  const discountVal = offer?.value || '20% OFF';
  let template = `Hi {{first_name}}! We miss you at CampaignPilot. Enjoy {{discount}} on your next order with code {{coupon_code}}. Valid for a limited time!`;

  if (channel === 'sms') {
    template = `CampaignPilot: Hey {{first_name}}, get {{discount}} using code {{coupon_code}}. Shop now!`;
  } else if (channel === 'email') {
    template = `Subject: Special Gift for You, {{first_name}}! 🎁\n\nDear {{first_name}},\n\nWe noticed it has been a while since your last visit. We have an exclusive offer just for you!\n\nUse coupon code {{coupon_code}} at checkout to claim your {{discount}} discount.\n\nWarm regards,\nCampaignPilot Team`;
  }

  return { messageTemplate: template };
}

function analyzeCampaignFallback(aggregatedStats = {}) {
  const sent = aggregatedStats.sent || 0;
  const delivered = aggregatedStats.delivered || 0;
  const converted = aggregatedStats.converted || 0;
  const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : 0;
  const convRate = delivered > 0 ? ((converted / delivered) * 100).toFixed(1) : 0;

  return {
    summary: `Campaign dispatched to ${sent} customers with a ${deliveryRate}% delivery rate and ${convRate}% conversion rate.`,
    strongestPattern: `High delivery engagement observed on preferred direct messaging channels.`,
    possibleWeakness: `Sub-optimal conversion among dormant customers with over 90 days inactivity.`,
    recommendedNextAction: `Run a follow-up win-back reminder with a time-bound ₹500 voucher bonus.`
  };
}

// ================= EXPORTED AI FUNCTIONS =================

export async function interpretIntent(text) {
  const groq = getGroqClient();
  if (!groq) {
    const fallbackData = interpretIntentFallback(text);
    await logInteraction('interpretIntent', { text }, 'FALLBACK_KEY_MISSING', fallbackData, true);
    return { data: fallbackData, usedFallback: true };
  }

  const systemPrompt = `You are an AI CRM assistant. Convert the user's plain text target audience description into structured segment filters.
Respond with JSON only matching this schema:
{
  "goal": "Descriptive summary goal",
  "filters": {
    "daysSinceLastOrder": { "gte": number, "lte": number },
    "lifetimeSpend": { "gte": number, "lte": number },
    "totalOrders": { "gte": number, "lte": number },
    "categories": { "in": ["beauty", "fashion", "electronics", "grocery", "home"] },
    "city": { "in": ["Mumbai", "Bengaluru", "Delhi", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad"] },
    "preferredChannel": { "in": ["whatsapp", "sms", "email", "rcs"] },
    "hasPurchased": true
  }
}
Omit filter keys that are not requested. Do not include markdown code fences or preambles.`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1
    });

    const rawOutput = response.choices[0]?.message?.content || '';
    const cleaned = cleanJsonResponse(rawOutput);
    const parsed = JSON.parse(cleaned);

    const validated = interpretIntentSchema.parse(parsed);
    await logInteraction('interpretIntent', { text }, rawOutput, validated, false);
    return { data: validated, usedFallback: false };
  } catch (error) {
    console.warn('[AI Service] interpretIntent failed or timed out. Falling back.', error.message);
    const fallbackData = interpretIntentFallback(text);
    await logInteraction('interpretIntent', { text }, error.message, fallbackData, true);
    return { data: fallbackData, usedFallback: true };
  }
}

export async function recommendCampaign({ filters, audienceSample }) {
  const groq = getGroqClient();
  if (!groq) {
    const fallbackData = recommendCampaignFallback({ filters, audienceSample });
    await logInteraction('recommendCampaign', { filters, audienceSample }, 'FALLBACK_KEY_MISSING', fallbackData, true);
    return { data: fallbackData, usedFallback: true };
  }

  const systemPrompt = `You are a CRM campaign strategist. Recommend the optimal communication channel, offer, and tone for a customer segment.
Respond with JSON only:
{
  "recommendedChannel": "whatsapp" | "sms" | "email" | "rcs",
  "reason": "String justification",
  "offer": { "type": "PERCENTAGE" | "FLAT", "value": "20% OFF" },
  "tone": "friendly & urgent"
}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify({ filters, sampleCount: audienceSample?.length || 0 }) }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2
    });

    const rawOutput = response.choices[0]?.message?.content || '';
    const cleaned = cleanJsonResponse(rawOutput);
    const parsed = JSON.parse(cleaned);

    const validated = recommendCampaignSchema.parse(parsed);
    await logInteraction('recommendCampaign', { filters }, rawOutput, validated, false);
    return { data: validated, usedFallback: false };
  } catch (error) {
    console.warn('[AI Service] recommendCampaign failed. Falling back.', error.message);
    const fallbackData = recommendCampaignFallback({ filters, audienceSample });
    await logInteraction('recommendCampaign', { filters }, error.message, fallbackData, true);
    return { data: fallbackData, usedFallback: true };
  }
}

export async function generateMessage({ goal, offer, tone, channel, personalizationFields }) {
  const groq = getGroqClient();
  if (!groq) {
    const fallbackData = generateMessageFallback({ goal, offer, tone, channel, personalizationFields });
    await logInteraction('generateMessage', { goal, offer, tone, channel }, 'FALLBACK_KEY_MISSING', fallbackData, true);
    return { data: fallbackData, usedFallback: true };
  }

  const systemPrompt = `You are a copywriter for retail CRM messages. Generate a highly converting message template using placeholders like {{first_name}}, {{discount}}, {{coupon_code}}.
Respond with JSON only:
{
  "messageTemplate": "Hi {{first_name}}! ..."
}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify({ goal, offer, tone, channel, personalizationFields }) }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7
    });

    const rawOutput = response.choices[0]?.message?.content || '';
    const cleaned = cleanJsonResponse(rawOutput);
    const parsed = JSON.parse(cleaned);

    const validated = generateMessageSchema.parse(parsed);
    await logInteraction('generateMessage', { goal, offer, tone, channel }, rawOutput, validated, false);
    return { data: validated, usedFallback: false };
  } catch (error) {
    console.warn('[AI Service] generateMessage failed. Falling back.', error.message);
    const fallbackData = generateMessageFallback({ goal, offer, tone, channel, personalizationFields });
    await logInteraction('generateMessage', { goal, offer, tone, channel }, error.message, fallbackData, true);
    return { data: fallbackData, usedFallback: true };
  }
}

export async function analyzeCampaign(aggregatedStats) {
  const groq = getGroqClient();
  if (!groq) {
    const fallbackData = analyzeCampaignFallback(aggregatedStats);
    await logInteraction('analyzeCampaign', { aggregatedStats }, 'FALLBACK_KEY_MISSING', fallbackData, true);
    return { data: fallbackData, usedFallback: true };
  }

  const systemPrompt = `You are an analytics AI for retail CRM. Analyze the aggregated performance statistics of a completed campaign and provide insights.
Respond with JSON only:
{
  "summary": "String",
  "strongestPattern": "String",
  "possibleWeakness": "String",
  "recommendedNextAction": "String"
}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify({ aggregatedStats }) }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3
    });

    const rawOutput = response.choices[0]?.message?.content || '';
    const cleaned = cleanJsonResponse(rawOutput);
    const parsed = JSON.parse(cleaned);

    const validated = analyzeCampaignSchema.parse(parsed);
    await logInteraction('analyzeCampaign', { aggregatedStats }, rawOutput, validated, false);
    return { data: validated, usedFallback: false };
  } catch (error) {
    console.warn('[AI Service] analyzeCampaign failed. Falling back.', error.message);
    const fallbackData = analyzeCampaignFallback(aggregatedStats);
    await logInteraction('analyzeCampaign', { aggregatedStats }, error.message, fallbackData, true);
    return { data: fallbackData, usedFallback: true };
  }
}
