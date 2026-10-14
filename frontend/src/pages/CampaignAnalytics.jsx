import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  DollarSign,
  Send,
  CheckCircle,
  AlertTriangle,
  Radio,
  Clock,
  ArrowRight,
  Eye,
  MousePointer,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getCampaignAnalytics } from '../api/campaigns.api';
import { useToast } from '../context/ToastContext';

export function CampaignAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const pollTimerRef = useRef(null);

  const fetchAnalytics = async (isInitial = false) => {
    try {
      const res = await getCampaignAnalytics(id);
      setData(res);

      // Check if we should keep polling
      if (res.status === 'SENDING' || res.status === 'QUEUED' || res.inProgress) {
        setPolling(true);
      } else {
        setPolling(false);
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      }
    } catch (err) {
      if (isInitial) {
        showToast(err.message || 'Failed to load campaign analytics', 'error');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(true);

    // Set up polling every 2.5s while active
    pollTimerRef.current = setInterval(() => {
      fetchAnalytics(false);
    }, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner text="Computing funnel analytics & attribution..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-400 mb-4">Campaign analytics not found.</p>
        <Button variant="secondary" onClick={() => navigate('/campaigns')}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const funnel = data.funnel || {
    sent: 0,
    delivered: 0,
    failed: 0,
    opened: 0,
    read: 0,
    clicked: 0
  };

  const openedOrRead = Math.max(funnel.opened || 0, funnel.read || 0);

  const chartData = [
    { stage: 'Sent', count: funnel.sent || 0, color: '#6366f1' },
    { stage: 'Delivered', count: funnel.delivered || 0, color: '#0ea5e9' },
    { stage: 'Opened/Read', count: openedOrRead, color: '#a855f7' },
    { stage: 'Clicked', count: funnel.clicked || 0, color: '#10b981' },
    { stage: 'Failed', count: funnel.failed || 0, color: '#f43f5e' }
  ];

  const attribution = data.attribution || {
    attributedOrders: 0,
    attributedRevenue: 0
  };

  const deliveryRate = funnel.sent > 0
    ? (((funnel.delivered || 0) / funnel.sent) * 100).toFixed(1)
    : '0.0';

  const clickRate = funnel.delivered > 0
    ? (((funnel.clicked || 0) / funnel.delivered) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate('/campaigns')}
            >
              Back
            </Button>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {data.campaignName}
            </h1>
            <Badge
              variant={data.status === 'COMPLETED' ? 'success' : 'info'}
              className="font-mono text-xs"
            >
              {data.status}
            </Badge>
            <Badge variant="channel" size="sm">
              {data.channel?.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 pl-2">
            Target Audience: {data.targetAudienceSize?.toLocaleString('en-IN') || 0} shoppers
          </p>
        </div>

        {/* Live Delivery Status Indicator */}
        <div className="flex items-center gap-3">
          {polling ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-pulse">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Live Delivery in Progress
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Delivery Lifecycle Completed
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchAnalytics(false)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Dispatched"
          value={funnel.sent?.toLocaleString('en-IN') || 0}
          subtitle="Total sends"
          icon={Send}
          color="indigo"
        />
        <StatCard
          title="Delivered"
          value={funnel.delivered?.toLocaleString('en-IN') || 0}
          subtitle={`${deliveryRate}% rate`}
          icon={CheckCircle}
          color="sky"
        />
        <StatCard
          title="Opened/Read"
          value={openedOrRead?.toLocaleString('en-IN') || 0}
          subtitle="User engagement"
          icon={Eye}
          color="purple"
        />
        <StatCard
          title="Clicked"
          value={funnel.clicked?.toLocaleString('en-IN') || 0}
          subtitle={`${clickRate}% CTR`}
          icon={MousePointer}
          color="emerald"
        />
        <StatCard
          title="Attributed Orders"
          value={attribution.attributedOrders?.toLocaleString('en-IN') || 0}
          subtitle="7-day window"
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          title="Attributed Revenue"
          value={`₹${(attribution.attributedRevenue || 0).toLocaleString('en-IN')}`}
          subtitle="Simulated"
          icon={DollarSign}
          color="emerald"
        />
      </div>

      {/* Grid: Delivery Funnel Chart & Simulated Attribution Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Funnel Chart (7 cols) */}
        <Card className="lg:col-span-7 p-6 bg-slate-900/80 border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Delivery & Engagement Funnel</h2>
              <p className="text-xs text-slate-400">
                Real-time lifecycle events streamed from the Channel Simulator
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Events: {((Number(funnel.sent) || 0) + (Number(funnel.delivered) || 0) + (Number(funnel.read) || 0) + (Number(funnel.clicked) || 0) + (Number(funnel.failed) || 0)).toLocaleString('en-IN')} total
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="stage"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#1e293b',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`${value} events`, 'Volume']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs text-slate-400">
            <div>
              <span className="block text-slate-500 uppercase text-[10px]">Delivery Success</span>
              <span className="font-bold text-sky-400">{deliveryRate}%</span>
            </div>
            <div>
              <span className="block text-slate-500 uppercase text-[10px]">Click Through Rate</span>
              <span className="font-bold text-emerald-400">{clickRate}%</span>
            </div>
            <div>
              <span className="block text-slate-500 uppercase text-[10px]">Failed Deliveries</span>
              <span className="font-bold text-rose-400">{funnel.failed || 0}</span>
            </div>
          </div>
        </Card>

        {/* Attribution Card (5 cols) */}
        <Card className="lg:col-span-5 p-6 bg-slate-900/80 border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Simulated Attribution
              </h2>
              <Badge variant="warning" size="sm">7-Day Window</Badge>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Attribution Heuristic: Any order placed by a recipient within 7 days of clicking this campaign's link is credited to this campaign. Clearly noted as simulated in code & responses.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Attributed Order Conversions</span>
                <span className="text-base font-bold text-white font-mono">
                  {attribution.attributedOrders} orders
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span className="text-xs text-slate-400">Attributed Gross Revenue</span>
                <span className="text-lg font-extrabold text-emerald-400 font-mono">
                  ₹{(attribution.attributedRevenue || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
            Simulated lift calculations based on organic customer purchase velocity.
          </div>
        </Card>
      </div>

      {/* AI Campaign Analyst Panel */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-purple-950/30 via-slate-900/90 to-indigo-950/30 border-purple-500/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              AI Campaign Analyst
            </div>
            <h2 className="text-xl font-bold text-white">Post-Campaign Evaluation & Insights</h2>
          </div>

          {data.usedFallback && (
            <Badge variant="default" size="sm">Rule-Engine Evaluated (Fallback)</Badge>
          )}
        </div>

        {data.aiInsight ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Executive Summary
              </span>
              <p className="text-sm text-slate-200 leading-relaxed">
                {data.aiInsight.summary}
              </p>
            </div>

            {/* Pattern & Weakness */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Strongest Pattern
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {data.aiInsight.strongestPattern}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Possible Bottleneck
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {data.aiInsight.possibleWeakness}
                </p>
              </div>
            </div>

            {/* Recommended Next Action */}
            <div className="p-5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-indigo-400" /> Recommended Next Action
                </span>
                <p className="text-sm font-semibold text-white">
                  {data.aiInsight.recommendedNextAction}
                </p>
              </div>

              <Button
                variant="ai"
                size="md"
                icon={ArrowRight}
                onClick={() =>
                  navigate('/campaigns/new', {
                    state: {
                      intentText: data.aiInsight.recommendedNextAction,
                      goal: data.aiInsight.recommendedNextAction
                    }
                  })
                }
                className="whitespace-nowrap"
              >
                Execute Next Action
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-sm bg-slate-950/40 rounded-xl border border-slate-800">
            {data.status === 'COMPLETED' ? (
              'AI analysis will be compiled momentarily...'
            ) : (
              'Delivery in progress. The AI Campaign Analyst will summarize results once all messages have completed delivery.'
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
