import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  ShoppingBag
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner, SkeletonRow } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { getCustomers } from '../api/customers.api';
import { useToast } from '../context/ToastContext';

const CITIES = ['All', 'Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad'];
const CHANNELS = ['All', 'whatsapp', 'sms', 'email', 'rcs'];
const CATEGORIES = ['All', 'beauty', 'fashion', 'electronics', 'grocery', 'home'];

export function Customers() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedChannel, setSelectedChannel] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('lastOrderAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    async function fetchCustomers() {
      setLoading(true);
      try {
        const params = {
          page,
          limit: 15,
          sortBy,
          sortOrder
        };

        if (selectedCity !== 'All') params.city = selectedCity;
        if (selectedChannel !== 'All') params.preferredChannel = selectedChannel;
        if (selectedCategory !== 'All') params.category = selectedCategory;

        const res = await getCustomers(params);
        setCustomers(res.customers || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      } catch (err) {
        showToast(err.message || 'Failed to fetch customers', 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchCustomers();
  }, [page, selectedCity, selectedChannel, selectedCategory, sortBy, sortOrder]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-400" />
            Shopper Profiles
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and inspect {total.toLocaleString('en-IN')} synthetic shoppers with realistic purchase behaviors.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/segments')}
          icon={Filter}
        >
          Open Segment Builder
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* City filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>City: {c}</option>
              ))}
            </select>
          </div>

          {/* Channel filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <select
              value={selectedChannel}
              onChange={(e) => {
                setSelectedChannel(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>Channel: {ch.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>Category: {cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
          <span>Sort:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('-');
              setSortBy(sb);
              setSortOrder(so);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="lastOrderAt-desc">Recent Purchase (Newest)</option>
            <option value="lastOrderAt-asc">Recent Purchase (Oldest / Dormant)</option>
            <option value="lifetimeSpend-desc">Highest Lifetime Spend</option>
            <option value="totalOrders-desc">Most Orders</option>
          </select>
        </div>
      </Card>

      {/* Customer Table */}
      <Card className="p-0 overflow-hidden border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Shopper</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">City</th>
                <th className="py-3.5 px-4">Orders</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4">Last Order</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12">
                    <LoadingSpinner text="Fetching shopper profiles..." />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12">
                    <EmptyState
                      title="No shoppers matched your criteria"
                      description="Try loosening your city, category, or channel filters."
                    />
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const daysSince = c.lastOrderAt
                    ? Math.floor((new Date() - new Date(c.lastOrderAt)) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <tr
                      key={c._id}
                      onClick={() => navigate(`/customers/${c._id}`)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                          {c.name}
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          {c.externalId || c.customerId || 'CUST-ID'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        <div className="truncate max-w-[160px]">{c.email}</div>
                        <div className="text-slate-400 font-mono">{c.phone}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" /> {c.city}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-200">
                        {c.totalOrders}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-bold text-emerald-400 font-mono">
                        ₹{c.lifetimeSpend?.toLocaleString('en-IN') || 0}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {daysSince !== null ? (
                          <span
                            className={
                              daysSince >= 60
                                ? 'text-amber-400 font-medium'
                                : 'text-slate-300'
                            }
                          >
                            {daysSince}d ago
                          </span>
                        ) : (
                          'Never'
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant="channel" size="sm">
                          {c.preferredChannel?.toUpperCase()}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={ExternalLink}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${c._id}`);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900/60">
            <div>
              Showing page <span className="text-white font-semibold">{page}</span> of{' '}
              <span className="text-white font-semibold">{totalPages}</span> ({total} shoppers total)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                icon={ChevronLeft}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                icon={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
