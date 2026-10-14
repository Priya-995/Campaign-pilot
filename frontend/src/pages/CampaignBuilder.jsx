import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Users,
  Target,
  Send,
  MessageSquare,
  CheckCircle2,
  Rocket,
  RefreshCw,
  Edit3,
  Lightbulb,
  Radio,
  Tag,
  ShieldCheck,
  Check,
  ChevronRight
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { interpretIntent, recommendCampaign, generateMessage } from '../api/ai.api';
import { previewSegment, createSegment } from '../api/segments.api';
import { createCampaign, launchCampaign } from '../api/campaigns.api';
import { useToast } from '../context/ToastContext';

const STAGES = [
  { id: 1, label: 'Goal', icon: Target },
  { id: 2, label: 'Audience', icon: Users },
  { id: 3, label: 'Strategy', icon: Lightbulb },
  { id: 4, label: 'Message', icon: MessageSquare },
  { id: 5, label: 'Review', icon: CheckCircle2 }
];

export function CampaignBuilder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentStage, setCurrentStage] = useState(1);

  // Stage 1: Goal & Intent
  const [intentText, setIntentText] = useState(
    location.state?.intentText ||
    "Bring back customers who haven't purchased in the last 60 days and previously spent more than ₹2,000"
  );
  const [goal, setGoal] = useState(
    location.state?.interpretedData?.goal ||
    location.state?.goal ||
    "Re-engage dormant high-spend shoppers"
  );
  const [campaignName, setCampaignName] = useState("Q3 VIP Win-Back Initiative");
  const [interpretingGoal, setInterpretingGoal] = useState(false);

  // Stage 2: Audience & Filters
  const [filters, setFilters] = useState(
    location.state?.interpretedData?.filters ||
    location.state?.interpretedFilters || {
      daysSinceLastOrder: { gte: 60 },
      lifetimeSpend: { gte: 2000 }
    }
  );
  const [audiencePreview, setAudiencePreview] = useState(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [segmentId, setSegmentId] = useState(location.state?.segmentId || null);

  // Stage 3: Strategy & Recommendation
  const [channel, setChannel] = useState('whatsapp');
  const [offerType, setOfferType] = useState('PERCENTAGE');
  const [offerValue, setOfferValue] = useState('20% OFF');
  const [tone, setTone] = useState('friendly & persuasive');
  const [strategyReason, setStrategyReason] = useState('');
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyAIGenerated, setStrategyAIGenerated] = useState(false);

  // Stage 4: Message Template & Personalization
  const [messageTemplate, setMessageTemplate] = useState(
    "Hello {{first_name}}! 🎁 We noticed it has been a while since your last visit. Here is an exclusive offer for you: Use code {{coupon_code}} at checkout to enjoy {{discount}}! Valid this week only."
  );
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [messageAIGenerated, setMessageAIGenerated] = useState(false);

  // Launching state
  const [launching, setLaunching] = useState(false);

  // Auto-fetch audience preview on mount or filter change
  useEffect(() => {
    async function evaluateAudience() {
      setAudienceLoading(true);
      try {
        const preview = await previewSegment(filters);
        setAudiencePreview(preview);
      } catch (err) {
        console.warn('Audience preview failed:', err.message);
      } finally {
        setAudienceLoading(false);
      }
    }

    evaluateAudience();
  }, [filters]);

  // Stage 1 Action: Re-interpret Intent
  const handleInterpretIntent = async () => {
    if (!intentText.trim()) return;
    setInterpretingGoal(true);
    try {
      const res = await interpretIntent(intentText);
      setGoal(res.data.goal || intentText);
      if (res.data.filters) {
        setFilters(res.data.filters);
      }
      showToast(
        res.usedFallback ? 'Interpreted via Rule Engine (Fallback)' : 'AI structured intent successfully',
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to interpret intent', 'error');
    } finally {
      setInterpretingGoal(false);
    }
  };

  // Stage 3 Action: Request Strategy Recommendation from AI
  const handleFetchStrategy = async () => {
    setStrategyLoading(true);
    try {
      const res = await recommendCampaign({
        filters,
        audienceSample: audiencePreview?.sampleCustomers || []
      });

      if (res.data) {
        if (res.data.recommendedChannel) setChannel(res.data.recommendedChannel.toLowerCase());
        if (res.data.offer) {
          setOfferType(res.data.offer.type || 'PERCENTAGE');
          setOfferValue(res.data.offer.value || '20% OFF');
        }
        if (res.data.tone) setTone(res.data.tone);
        if (res.data.reason) setStrategyReason(res.data.reason);
        setStrategyAIGenerated(true);
      }
      showToast(
        res.usedFallback ? 'Strategy recommendation generated (fallback)' : 'AI strategy recommended',
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to recommend strategy', 'error');
    } finally {
      setStrategyLoading(false);
    }
  };

  // Stage 4 Action: Generate Message from AI
  const handleGenerateMessage = async () => {
    setGeneratingMessage(true);
    try {
      const res = await generateMessage({
        goal,
        offer: { type: offerType, value: offerValue },
        tone,
        channel,
        personalizationFields: ['first_name', 'discount', 'coupon_code']
      });

      if (res.data?.messageTemplate) {
        setMessageTemplate(res.data.messageTemplate);
        setMessageAIGenerated(true);
      }
      showToast(
        res.usedFallback ? 'Message crafted using template fallback' : 'AI generated message copy',
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to generate message copy', 'error');
    } finally {
      setGeneratingMessage(false);
    }
  };

  // When moving to Strategy stage, auto-request if not yet requested
  const handleNextStage = () => {
    if (currentStage === 2 && !strategyAIGenerated) {
      handleFetchStrategy();
    }
    if (currentStage === 3 && !messageAIGenerated) {
      handleGenerateMessage();
    }
    setCurrentStage((s) => Math.min(5, s + 1));
  };

  // Launch Action: Persist Campaign -> Launch -> Route to Analytics
  const handleLaunchCampaign = async () => {
    setLaunching(true);
    try {
      // 1. Ensure segment is saved if not already
      let effectiveSegmentId = segmentId;
      if (!effectiveSegmentId) {
        const segRes = await createSegment({
          name: `${campaignName} Segment`,
          description: `Audience criteria for ${campaignName}`,
          filters
        });
        effectiveSegmentId = segRes._id;
        setSegmentId(effectiveSegmentId);
      }

      // 2. Create campaign in DRAFT status
      const createdCampaign = await createCampaign({
        name: campaignName.trim(),
        goal: goal.trim(),
        segmentId: effectiveSegmentId,
        channel,
        messageTemplate,
        personalizationFields: ['first_name', 'discount', 'coupon_code'],
        offer: { type: offerType, value: offerValue }
      });

      // 3. Launch campaign (transitions DRAFT -> QUEUED -> SENDING)
      const launchedRes = await launchCampaign(createdCampaign._id);

      showToast(
        `Campaign launched! Dispatched to ${launchedRes.materializedAudienceCount || 'all'} shoppers.`,
        'success'
      );

      // 4. Navigate to Campaign Analytics immediately to observe live delivery
      navigate(`/campaigns/${createdCampaign._id}/analytics`);
    } catch (err) {
      showToast(err.message || 'Failed to launch campaign', 'error');
      setLaunching(false);
    }
  };

  // Helper to render real personalized sample previews
  const renderPersonalizedSamples = () => {
    const samples = audiencePreview?.sampleCustomers?.slice(0, 3) || [];
    if (samples.length === 0) {
      return [
        { name: 'Priya Sharma', text: messageTemplate.replace('{{first_name}}', 'Priya').replace('{{coupon_code}}', 'WINBACK20').replace('{{discount}}', offerValue) },
        { name: 'Rahul Verma', text: messageTemplate.replace('{{first_name}}', 'Rahul').replace('{{coupon_code}}', 'WINBACK20').replace('{{discount}}', offerValue) },
        { name: 'Ananya Roy', text: messageTemplate.replace('{{first_name}}', 'Ananya').replace('{{coupon_code}}', 'WINBACK20').replace('{{discount}}', offerValue) }
      ];
    }

    return samples.map((c) => {
      const firstName = c.name?.split(' ')[0] || 'Shopper';
      const custSuffix = (c.customerId || c.externalId || '99').slice(-4);
      const couponCode = `SAVE-${custSuffix}`;
      const rendered = messageTemplate
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{coupon_code\}\}/g, couponCode)
        .replace(/\{\{discount\}\}/g, offerValue);

      return {
        name: c.name,
        channel: c.preferredChannel || channel,
        text: rendered
      };
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Wizard Header & Stepper */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              AI-Guided Campaign Flow
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create Engagement Campaign
            </h1>
          </div>

          <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            Stage {currentStage} of 5: <span className="text-white font-semibold">{STAGES[currentStage - 1].label}</span>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {STAGES.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStage > s.id;
            const isCurrent = currentStage === s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStage(s.id)}
                className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-center sm:justify-start gap-2.5 transition-all text-xs font-semibold ${
                  isCurrent
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : s.id}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage 1: Goal & Campaign Name */}
      {currentStage === 1 && (
        <Card className="p-6 sm:p-8 bg-slate-900/80 border-slate-800 space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Define Campaign Intent</h2>
            <p className="text-xs text-slate-400">
              State what you want to achieve. Groq AI maps your natural language into target criteria.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Campaign Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. VIP Dormant Win-Back Push"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Natural Language Objective
                </label>
                <Badge variant="ai" size="sm">AI Interpreted</Badge>
              </div>
              <textarea
                rows={3}
                value={intentText}
                onChange={(e) => setIntentText(e.target.value)}
                placeholder="Describe your target shoppers and goal..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-indigo-500"
              />
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide">
                  Formulated Objective:
                </span>
                <p className="text-sm font-semibold text-slate-100">{goal}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                loading={interpretingGoal}
                onClick={handleInterpretIntent}
              >
                Re-evaluate Intent
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              onClick={handleNextStage}
            >
              Continue to Audience
            </Button>
          </div>
        </Card>
      )}

      {/* Stage 2: Target Audience */}
      {currentStage === 2 && (
        <Card className="p-6 sm:p-8 bg-slate-900/80 border-slate-800 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Target Shopper Audience</h2>
              <p className="text-xs text-slate-400">
                Deterministic Mongo query computed from your intent. The LLM never touches MongoDB directly.
              </p>
            </div>
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-right">
              <span className="text-xs text-indigo-300 block">Matched Shoppers</span>
              <span className="text-2xl font-bold text-white font-mono">
                {audienceLoading ? '...' : audiencePreview?.estimatedSize?.toLocaleString('en-IN') || 0}
              </span>
            </div>
          </div>

          {/* Criteria Badges */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Active Segmentation Filters:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {filters.daysSinceLastOrder?.gte && (
                <Badge variant="default">
                  Inactivity: ≥ {filters.daysSinceLastOrder.gte} days
                </Badge>
              )}
              {filters.lifetimeSpend?.gte && (
                <Badge variant="default">
                  Spend: ≥ ₹{filters.lifetimeSpend.gte}
                </Badge>
              )}
              {filters.city?.in && (
                <Badge variant="default">
                  Cities: {filters.city.in.join(', ')}
                </Badge>
              )}
              {filters.preferredChannel?.in && (
                <Badge variant="default">
                  Channels: {filters.preferredChannel.in.join(', ')}
                </Badge>
              )}
              {filters.categories?.in && (
                <Badge variant="default">
                  Categories: {filters.categories.in.join(', ')}
                </Badge>
              )}
            </div>
          </div>

          {/* Sample Inclusion Explanations */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Audience Sample & Inclusion Proofs
            </h3>
            {audienceLoading ? (
              <LoadingSpinner text="Computing audience sample..." />
            ) : (
              <div className="space-y-2.5">
                {(audiencePreview?.sampleCustomers || []).slice(0, 3).map((c) => (
                  <div
                    key={c._id || c.customerId}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-slate-400 font-mono">
                        {c.customerId} • Spend: ₹{c.lifetimeSpend?.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      {c.inclusionReasons?.[0] || 'Matched segmentation criteria'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button
              variant="secondary"
              size="md"
              icon={ArrowLeft}
              onClick={() => setCurrentStage(1)}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              onClick={handleNextStage}
            >
              Confirm Audience & Pick Strategy
            </Button>
          </div>
        </Card>
      )}

      {/* Stage 3: Strategy & Channel Recommendation */}
      {currentStage === 3 && (
        <Card className="p-6 sm:p-8 bg-slate-900/80 border-slate-800 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white">Engagement Strategy</h2>
                <Badge variant="ai" size="sm">Groq AI Recommendation</Badge>
              </div>
              <p className="text-xs text-slate-400">
                AI recommends the channel, incentive, and copywriting tone. Fully editable by marketer.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={strategyLoading}
              onClick={handleFetchStrategy}
            >
              Regenerate Strategy
            </Button>
          </div>

          {/* AI Strategy Reasoning Banner */}
          {strategyReason && (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">AI Recommendation Rationale:</span>
                <p className="text-slate-300">{strategyReason}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Delivery Channel */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Delivery Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
              >
                <option value="whatsapp">WhatsApp (Rich Messaging)</option>
                <option value="sms">SMS (Direct Text)</option>
                <option value="email">Email (Transactional/Promo)</option>
                <option value="rcs">RCS (Interactive Chat)</option>
              </select>
            </div>

            {/* Offer Value */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Offer / Incentive Value
              </label>
              <input
                type="text"
                value={offerValue}
                onChange={(e) => setOfferValue(e.target.value)}
                placeholder="e.g. 20% OFF or ₹500 VOUCHER"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
              />
            </div>

            {/* Tone of Voice */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tone of Voice
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
              >
                <option value="friendly & persuasive">Friendly & Persuasive</option>
                <option value="exclusive & VIP">Exclusive & VIP</option>
                <option value="urgent & time-sensitive">Urgent & Time-Sensitive</option>
                <option value="casual & conversational">Casual & Conversational</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button
              variant="secondary"
              size="md"
              icon={ArrowLeft}
              onClick={() => setCurrentStage(2)}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              onClick={handleNextStage}
            >
              Generate Message Copy
            </Button>
          </div>
        </Card>
      )}

      {/* Stage 4: Message Template & Personalization */}
      {currentStage === 4 && (
        <Card className="p-6 sm:p-8 bg-slate-900/80 border-slate-800 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white">Personalized Message Copy</h2>
                <Badge variant="ai" size="sm">AI Generated</Badge>
              </div>
              <p className="text-xs text-slate-400">
                Variables like <span className="font-mono text-indigo-400">{'{{first_name}}'}</span> and <span className="font-mono text-indigo-400">{'{{coupon_code}}'}</span> are rendered dynamically per customer.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={generatingMessage}
              onClick={handleGenerateMessage}
            >
              Regenerate Copy
            </Button>
          </div>

          {/* Template Editor */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Message Template
            </label>
            <textarea
              rows={5}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm font-sans focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Live Personalized Samples */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Live Personalized Preview for Real Shoppers (3 Examples)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderPersonalizedSamples().map((sample, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between"
                >
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-semibold text-xs text-white">{sample.name}</span>
                      <Badge variant="channel" size="sm">{channel.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {sample.text}
                    </p>
                  </div>
                  <span className="text-[10px] text-emerald-400/80 font-mono">
                    ✓ Validated merge tokens
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button
              variant="secondary"
              size="md"
              icon={ArrowLeft}
              onClick={() => setCurrentStage(3)}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              onClick={handleNextStage}
            >
              Review & Finalize
            </Button>
          </div>
        </Card>
      )}

      {/* Stage 5: Review & Launch */}
      {currentStage === 5 && (
        <Card className="p-6 sm:p-8 bg-slate-900/80 border-slate-800 space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Final Campaign Review</h2>
            <p className="text-xs text-slate-400">
              Verify all parameters before launching to the asynchronous Channel Simulator.
            </p>
          </div>

          {/* Review Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Campaign Name</span>
              <p className="text-sm font-semibold text-white">{campaignName}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Target Audience</span>
              <p className="text-sm font-semibold text-indigo-400">
                {audiencePreview?.estimatedSize?.toLocaleString('en-IN') || 0} Matched Shoppers
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Channel & Offer</span>
              <p className="text-sm font-semibold text-white">
                {channel.toUpperCase()} • {offerValue}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Tone</span>
              <p className="text-sm font-semibold text-white capitalize">{tone}</p>
            </div>
          </div>

          {/* Final Message Snippet */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Message Copy
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={Edit3}
                onClick={() => setCurrentStage(4)}
              >
                Edit Copy
              </Button>
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap font-mono p-3 bg-slate-900 rounded-lg border border-slate-800">
              {messageTemplate}
            </p>
          </div>

          {/* Launch Architecture Callout */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex items-start gap-3">
            <Radio className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="font-semibold block mb-0.5">Asynchronous Hand-off to Channel Simulator</span>
              <p className="text-slate-300">
                Upon launch, the CRM creates Communication records and dispatches them via HTTP POST to the Channel Simulator on port 5001. The simulator will return 202 immediately and asynchronously stream delivery webhooks back.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button
              variant="secondary"
              size="md"
              icon={ArrowLeft}
              onClick={() => setCurrentStage(4)}
            >
              Back
            </Button>
            <Button
              variant="ai"
              size="lg"
              loading={launching}
              icon={Rocket}
              onClick={handleLaunchCampaign}
              className="px-8"
            >
              Launch Campaign Now
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
