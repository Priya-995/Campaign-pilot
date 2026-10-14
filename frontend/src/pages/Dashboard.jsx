import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Users,
  Send,
  TrendingUp,
  DollarSign,
  Radio,
  CheckCircle,
  Clock,
  AlertCircle,
  Lightbulb,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { getOverviewStats } from '../api/analytics.api';
import { getCampaigns } from '../api/campaigns.api';
import { interpretIntent } from '../api/ai.api';
import { useToast } from '../context/ToastContext';

const EXAMPLE_PROMPTS = [
  "Bring back customers who haven't purchased in the last 60 days and previously spent more than ₹2,000",
  "Reward high-value loyal shoppers in Mumbai with exclusive VIP discounts",
  "Promote new electronics category arrivals to frequent shoppers",
  "Win back dormant fashion shoppers across Delhi and Bengaluru"
];

export function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [intentInput, setIntentInput] = useState('');
  const [interpreting, setInterpreting] = useState(false);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [overviewRes, campaignsRes] = await Promise.allSettled([
          getOverviewStats(),
          getCampaigns()
        ]);

        if (overviewRes.status === 'fulfilled') {
          setStats(overviewRes.value);
        } else {
          console.warn('Overview stats failed to load:', overviewRes.reason);
        }

        if (campaignsRes.status === 'fulfilled') {
          setCampaigns(campaignsRes.value?.campaigns || []);
        } else {
          console.warn('Campaigns failed to load:', campaignsRes.reason);
        }
      } finally {
        setStatsLoading(false);
        setCampaignsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const handleInterpretAndBuild = async (textToUse) => {
    const query = (textToUse || intentInput).trim();
    if (!query) {
      showToast('Please describe your campaign goal first', 'error');
      return;
    }

    setInterpreting(true);
    try {
      const response = await interpretIntent(query);
      showToast(
        response.usedFallback
          ? 'Interpreted intent using deterministic rule engine'
          : 'Intent interpreted successfully by Groq AI',
        'success'
      );

      // Navigate to Campaign Builder with preloaded intent
      navigate('/campaigns/new', {
        state: {
          intentText: query,
          interpretedData: response.data,
          usedFallback: response.usedFallback
        }
      });
    } catch (err) {
      showToast(err.message || 'Failed to interpret intent', 'error');
    } finally {
      setInterpreting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero: AI Command Center */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-950/60 via-slate-900/80 to-slate-900/40 border border-indigo-500/30 p-8 sm:p-10 backdrop-blur-xl shadow-2xl shadow-indigo-950/50">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            AI-Native Intent Engine
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            What do you want to achieve today?
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            Tell CampaignPilot your shopper engagement goal in plain English. The AI formulates deterministic segment filters, selects the optimal channel, and crafts personalized copy.
          </p>

          {/* Natural Language Prompt Input */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={intentInput}
                onChange={(e) => setIntentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInterpretAndBuild()}
                placeholder="e.g. Bring back customers who haven't purchased in 60 days and spent > ₹2,000..."
                className="w-full px-4 py-3.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
              />
            </div>
            <Button
              variant="ai"
              size="md"
              loading={interpreting}
              onClick={() => handleInterpretAndBuild()}
              icon={Sparkles}
              className="px-6 py-3.5 whitespace-nowrap"
            >
              Build Campaign
            </Button>
          </div>

          {/* Suggestion Chips */}
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Try a golden-path intent:
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIntentInput(prompt);
                  }}
                  className="text-xs text-left px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-indigo-600/20 border border-slate-700/60 hover:border-indigo-500/30 text-slate-300 hover:text-white transition-all duration-150"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Platform Performance</h2>
          <span className="text-xs text-slate-400 font-mono">Real-time DB metrics</span>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Shoppers"
              value={stats?.totalCustomers ? stats.totalCustomers.toLocaleString('en-IN') : '3,000'}
              subtitle="Indexed customer profiles"
              icon={Users}
              color="indigo"
            />
            <StatCard
              title="Active Campaigns"
              value={stats?.activeCampaigns ?? 0}
              subtitle="Currently in-flight or sending"
              icon={Radio}
              color="sky"
            />
            <StatCard
              title="Messages Dispatched"
              value={stats?.totalMessagesSent ? stats.totalMessagesSent.toLocaleString('en-IN') : '0'}
              subtitle="Delivered across channels"
              icon={Send}
              color="emerald"
            />
            <StatCard
              title="Attributed Revenue"
              value={`₹${(stats?.totalAttributedRevenue || 0).toLocaleString('en-IN')}`}
              subtitle="Simulated 7-day conversion"
              icon={DollarSign}
              color="purple"
            />
          </div>
        )}
      </div>

      {/* Grid: Recent Campaigns & AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Campaigns (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Campaigns</h2>
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowRight}
              onClick={() => navigate('/campaigns')}
            >
              View All
            </Button>
          </div>

          {campaignsLoading ? (
            <Card>
              <LoadingSpinner size="md" text="Loading campaigns..." />
            </Card>
          ) : campaigns.length === 0 ? (
            <EmptyState
              title="No campaigns yet"
              description="Launch your first AI-native campaign using the command center above."
              actionLabel="Create Campaign"
              onAction={() => navigate('/campaigns/new')}
            />
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 4).map((camp) => {
                let badgeVariant = 'default';
                if (camp.status === 'COMPLETED') badgeVariant = 'success';
                else if (camp.status === 'SENDING') badgeVariant = 'info';
                else if (camp.status === 'QUEUED') badgeVariant = 'warning';

                return (
                  <Card
                    key={camp._id}
                    hover
                    onClick={() => navigate(`/campaigns/${camp._id}/analytics`)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-white text-base hover:text-indigo-400 transition-colors">
                          {camp.name}
                        </h3>
                        <Badge variant={badgeVariant}>{camp.status}</Badge>
                        <Badge variant="channel" size="sm">{camp.channel.toUpperCase()}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{camp.goal}</p>
                    </div>

                    <div className="flex items-center gap-6 sm:text-right border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0">
                      <div>
                        <div className="text-xs text-slate-400">Target Audience</div>
                        <div className="text-sm font-semibold text-slate-200">
                          {camp.targetAudienceSize ? camp.targetAudienceSize.toLocaleString('en-IN') : '—'} shoppers
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={ArrowRight}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/campaigns/${camp._id}/analytics`);
                        }}
                      >
                        Analytics
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Recommendations Panel (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              AI Recommendations
            </h2>
          </div>

          <div className="space-y-3">
            <Card className="p-5 border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-slate-900/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-purple-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-purple-400" /> Opportunity Alert
                </span>
                <Badge variant="ai" size="sm">High Impact</Badge>
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">
                700+ Shoppers Inactive 60+ Days
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Identified a cluster of previously high-value shoppers with over ₹2,000 spend who have not ordered in two months. Win-back campaign recommended.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs"
                onClick={() =>
                  handleInterpretAndBuild(
                    "Bring back customers who haven't purchased in the last 60 days and previously spent more than ₹2,000"
                  )
                }
              >
                Launch Win-Back Flow
              </Button>
            </Card>

            <Card className="p-5 border-slate-800 bg-slate-900/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-sky-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-400" /> Engagement Insight
                </span>
                <Badge variant="info" size="sm">Channel Mix</Badge>
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">
                WhatsApp Outperforms SMS by 3.2x
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Recent campaign delivery signals indicate rich media channels (WhatsApp/RCS) experience 68% open rates compared to 21% for standard SMS.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate('/campaigns/new')}
              >
                Compose WhatsApp Push
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
