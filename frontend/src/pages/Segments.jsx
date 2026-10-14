import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Filter,
  Users,
  Sparkles,
  CheckCircle2,
  Info,
  Save,
  Rocket,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { previewSegment, createSegment, getSegments } from '../api/segments.api';
import { useToast } from '../context/ToastContext';

const AVAILABLE_CITIES = ['Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad'];
const AVAILABLE_CHANNELS = ['whatsapp', 'sms', 'email', 'rcs'];
const AVAILABLE_CATEGORIES = ['beauty', 'fashion', 'electronics', 'grocery', 'home'];

export function Segments() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Filters State
  const [minDaysInactive, setMinDaysInactive] = useState(60);
  const [maxDaysInactive, setMaxDaysInactive] = useState('');
  const [minSpend, setMinSpend] = useState(2000);
  const [maxSpend, setMaxSpend] = useState('');
  const [minOrders, setMinOrders] = useState('');
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Preview state
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Saved Segments state
  const [savedSegments, setSavedSegments] = useState([]);
  const [segmentsLoading, setSegmentsLoading] = useState(true);

  // Save Modal/Form state
  const [segmentName, setSegmentName] = useState('');
  const [savingSegment, setSavingSegment] = useState(false);

  // Build filters object
  const buildCurrentFilters = () => {
    const filters = {};

    if (minDaysInactive !== '' || maxDaysInactive !== '') {
      filters.daysSinceLastOrder = {};
      if (minDaysInactive !== '') filters.daysSinceLastOrder.gte = Number(minDaysInactive);
      if (maxDaysInactive !== '') filters.daysSinceLastOrder.lte = Number(maxDaysInactive);
    }

    if (minSpend !== '' || maxSpend !== '') {
      filters.lifetimeSpend = {};
      if (minSpend !== '') filters.lifetimeSpend.gte = Number(minSpend);
      if (maxSpend !== '') filters.lifetimeSpend.lte = Number(maxSpend);
    }

    if (minOrders !== '') {
      filters.totalOrders = { gte: Number(minOrders) };
    }

    if (selectedCities.length > 0) {
      filters.city = { in: selectedCities };
    }

    if (selectedChannels.length > 0) {
      filters.preferredChannel = { in: selectedChannels };
    }

    if (selectedCategories.length > 0) {
      filters.categories = { in: selectedCategories };
    }

    return filters;
  };

  // Debounced preview calculation
  useEffect(() => {
    const handler = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const filters = buildCurrentFilters();
        const res = await previewSegment(filters);
        setPreviewData(res);
      } catch (err) {
        console.warn('Segment preview failed:', err.message);
      } finally {
        setPreviewLoading(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [
    minDaysInactive,
    maxDaysInactive,
    minSpend,
    maxSpend,
    minOrders,
    selectedCities,
    selectedChannels,
    selectedCategories
  ]);

  // Load saved segments
  useEffect(() => {
    loadSavedSegments();
  }, []);

  const loadSavedSegments = async () => {
    try {
      const res = await getSegments();
      setSavedSegments(res.segments || res || []);
    } catch (err) {
      console.warn('Failed to load segments:', err.message);
    } finally {
      setSegmentsLoading(false);
    }
  };

  const handleSaveSegment = async () => {
    if (!segmentName.trim()) {
      showToast('Please provide a name for this segment', 'error');
      return;
    }

    setSavingSegment(true);
    try {
      const filters = buildCurrentFilters();
      await createSegment({
        name: segmentName.trim(),
        description: `Segment targeting ~${previewData?.estimatedSize || 0} customers`,
        filters
      });

      showToast('Segment saved successfully!', 'success');
      setSegmentName('');
      loadSavedSegments();
    } catch (err) {
      showToast(err.message || 'Failed to save segment', 'error');
    } finally {
      setSavingSegment(false);
    }
  };

  const toggleArrayItem = (setter, current, item) => {
    if (current.includes(item)) {
      setter(current.filter((x) => x !== item));
    } else {
      setter([...current, item]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-400" />
            Deterministic Audience Builder
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Build, preview, and explain shopper segments with deterministic MongoDB queries — 100% independent of AI.
          </p>
        </div>

        <Button
          variant="ai"
          size="sm"
          icon={Rocket}
          onClick={() =>
            navigate('/campaigns/new', {
              state: {
                interpretedFilters: buildCurrentFilters(),
                estimatedAudience: previewData?.estimatedSize
              }
            })
          }
        >
          Use in Campaign
        </Button>
      </div>

      {/* Grid: Builder Controls & Live Audience Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Filter Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Filter className="w-4 h-4 text-indigo-400" />
              Segmentation Criteria
            </h2>

            {/* Inactivity Window */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Days Inactive (Since Last Order)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Min Days</span>
                  <input
                    type="number"
                    value={minDaysInactive}
                    onChange={(e) => setMinDaysInactive(e.target.value)}
                    placeholder="e.g. 60"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Max Days</span>
                  <input
                    type="number"
                    value={maxDaysInactive}
                    onChange={(e) => setMaxDaysInactive(e.target.value)}
                    placeholder="e.g. 180"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Lifetime Spend */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lifetime Spend (₹)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Min (₹)</span>
                  <input
                    type="number"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Max (₹)</span>
                  <input
                    type="number"
                    value={maxSpend}
                    onChange={(e) => setMaxSpend(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Minimum Orders */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Min Total Orders
              </label>
              <input
                type="number"
                value={minOrders}
                onChange={(e) => setMinOrders(e.target.value)}
                placeholder="e.g. 2"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500"
              />
            </div>

            {/* City Chips */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Cities
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_CITIES.map((city) => {
                  const active = selectedCities.includes(city);
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => toggleArrayItem(setSelectedCities, selectedCities, city)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Channel Chips */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Preferred Channels
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_CHANNELS.map((ch) => {
                  const active = selectedChannels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleArrayItem(setSelectedChannels, selectedChannels, ch)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all uppercase ${
                        active
                          ? 'bg-sky-600 text-white border-sky-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Affinity */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category Affinity
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_CATEGORIES.map((cat) => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleArrayItem(setSelectedCategories, selectedCategories, cat)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all capitalize ${
                        active
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save Segment Box */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300">Save as Named Segment</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  placeholder="e.g. Dormant VIP Shoppers"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500"
                />
                <Button
                  variant="primary"
                  size="sm"
                  loading={savingSegment}
                  onClick={handleSaveSegment}
                  icon={Save}
                >
                  Save
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Live Audience Preview & Explainability (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top Audience Metric Banner */}
          <Card className="p-6 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 border-indigo-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Live MongoDB Evaluation
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl font-extrabold text-white">
                    {previewLoading ? (
                      <span className="text-slate-500 animate-pulse">Computing...</span>
                    ) : (
                      previewData?.estimatedSize?.toLocaleString('en-IN') || 0
                    )}
                  </span>
                  <span className="text-sm text-slate-300">matching shoppers</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ai"
                  size="sm"
                  icon={Rocket}
                  onClick={() =>
                    navigate('/campaigns/new', {
                      state: {
                        interpretedFilters: buildCurrentFilters(),
                        estimatedAudience: previewData?.estimatedSize
                      }
                    })
                  }
                >
                  Launch Campaign
                </Button>
              </div>
            </div>
          </Card>

          {/* Explainability Samples */}
          <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-400" />
                Audience Inspection & Why Included
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Deterministic inclusion proofs
              </span>
            </div>

            {previewLoading ? (
              <LoadingSpinner text="Evaluating customer inclusion criteria..." />
            ) : !previewData?.sampleCustomers || previewData.sampleCustomers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No shoppers match the current filter configuration.
              </div>
            ) : (
              <div className="space-y-3">
                {previewData.sampleCustomers.map((c) => (
                  <div
                    key={c._id || c.customerId}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-slate-200 text-sm">{c.name}</span>
                        <span className="text-xs font-mono text-slate-400">({c.customerId || c.externalId})</span>
                        <Badge variant="channel" size="sm">{c.preferredChannel?.toUpperCase()}</Badge>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        Spend: ₹{c.lifetimeSpend?.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Deterministic Inclusion Bullet Reasons */}
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                        Deterministic Inclusion Reasons:
                      </span>
                      <ul className="space-y-1">
                        {c.inclusionReasons && c.inclusionReasons.length > 0 ? (
                          c.inclusionReasons.map((reason, rIdx) => (
                            <li
                              key={rIdx}
                              className="text-xs text-slate-300 flex items-start gap-2"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                              <span>{reason}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-slate-400">
                            Matched active criteria filters.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Saved Segments List */}
          <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Layers className="w-4 h-4 text-purple-400" />
              Saved Segments Library ({savedSegments.length})
            </h2>

            {segmentsLoading ? (
              <LoadingSpinner size="sm" text="Loading saved segments..." />
            ) : savedSegments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No segments saved yet. Configure criteria above and click Save.
              </p>
            ) : (
              <div className="space-y-2.5">
                {savedSegments.map((seg) => (
                  <div
                    key={seg._id}
                    className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 text-sm">{seg.name}</div>
                      <div className="text-xs text-slate-400">{seg.description}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {seg.estimatedSize?.toLocaleString('en-IN') || 0} shoppers
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate('/campaigns/new', {
                            state: {
                              segmentId: seg._id,
                              interpretedFilters: seg.filters,
                              estimatedAudience: seg.estimatedSize,
                              goal: seg.name
                            }
                          })
                        }
                      >
                        Launch
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
