import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Plus,
  ArrowRight,
  Radio,
  CheckCircle,
  Clock,
  Sparkles,
  Users,
  MessageSquare
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { getCampaigns, launchCampaign } from '../api/campaigns.api';
import { useToast } from '../context/ToastContext';

export function Campaigns() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);

  const fetchCampaigns = async () => {
    try {
      const res = await getCampaigns();
      setCampaigns(res.campaigns || res || []);
    } catch (err) {
      showToast(err.message || 'Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleLaunchDraft = async (id, e) => {
    e.stopPropagation();
    setLaunchingId(id);
    try {
      await launchCampaign(id);
      showToast('Campaign launched successfully!', 'success');
      navigate(`/campaigns/${id}/analytics`);
    } catch (err) {
      showToast(err.message || 'Failed to launch campaign', 'error');
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Send className="w-6 h-6 text-indigo-400" />
            Campaigns Central
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your AI-generated shopper outreach campaigns and view delivery analytics.
          </p>
        </div>

        <Button
          variant="ai"
          size="sm"
          icon={Plus}
          onClick={() => navigate('/campaigns/new')}
        >
          Create New Campaign
        </Button>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <Card>
          <LoadingSpinner text="Fetching campaigns..." />
        </Card>
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns found"
          description="Create your first campaign using our AI command center."
          actionLabel="Build First Campaign"
          onAction={() => navigate('/campaigns/new')}
        />
      ) : (
        <div className="space-y-3">
          {campaigns.map((camp) => {
            let badgeVariant = 'default';
            if (camp.status === 'COMPLETED') badgeVariant = 'success';
            else if (camp.status === 'SENDING') badgeVariant = 'info';
            else if (camp.status === 'QUEUED') badgeVariant = 'warning';

            return (
              <Card
                key={camp._id}
                hover
                onClick={() => navigate(`/campaigns/${camp._id}/analytics`)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-slate-800/80"
              >
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-semibold text-white text-base hover:text-indigo-400 transition-colors">
                      {camp.name}
                    </h3>
                    <Badge variant={badgeVariant}>{camp.status}</Badge>
                    <Badge variant="channel" size="sm">
                      {camp.channel?.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{camp.goal}</p>
                  {camp.messageTemplate && (
                    <p className="text-xs text-slate-400/90 italic line-clamp-1 font-mono">
                      "{camp.messageTemplate}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-6 border-t md:border-t-0 border-slate-800/80 pt-3 md:pt-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Audience</div>
                    <div className="text-sm font-semibold text-slate-200">
                      {camp.targetAudienceSize ? camp.targetAudienceSize.toLocaleString('en-IN') : '—'} shoppers
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Launched</div>
                    <div className="text-xs text-slate-300 font-mono">
                      {camp.launchedAt ? new Date(camp.launchedAt).toLocaleDateString() : 'Draft'}
                    </div>
                  </div>

                  {camp.status === 'DRAFT' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={launchingId === camp._id}
                      onClick={(e) => handleLaunchDraft(camp._id, e)}
                    >
                      Launch
                    </Button>
                  ) : (
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
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
