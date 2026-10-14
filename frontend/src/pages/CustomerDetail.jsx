import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  ShoppingBag,
  Send,
  Calendar,
  MapPin,
  Mail,
  Phone,
  DollarSign,
  Tag,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getCustomerById, getCustomerOrders } from '../api/customers.api';
import { useToast } from '../context/ToastContext';

export function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [custRes, ordersRes] = await Promise.all([
          getCustomerById(id),
          getCustomerOrders(id)
        ]);

        setCustomer(custRes.customer || custRes);
        setOrders(ordersRes.orders || ordersRes || []);
        setCommunications(custRes.communications || []);
      } catch (err) {
        showToast(err.message || 'Failed to load customer profile', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner text="Loading customer profile & purchase history..." />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-400 mb-4">Customer not found.</p>
        <Button variant="secondary" onClick={() => navigate('/customers')}>
          Back to Customers
        </Button>
      </div>
    );
  }

  const daysSinceLastOrder = customer.lastOrderAt
    ? Math.floor((new Date() - new Date(customer.lastOrderAt)) / (1000 * 60 * 60 * 24))
    : 'N/A';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate('/customers')}
        >
          Back to Customers
        </Button>
      </div>

      {/* Header Profile Card */}
      <Card className="p-6 bg-slate-900/80 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-indigo-600/20 flex-shrink-0">
              {customer.name?.charAt(0) || 'C'}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">{customer.name}</h1>
                <Badge variant="channel">{customer.preferredChannel?.toUpperCase()}</Badge>
                <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                  {customer.externalId || customer.customerId}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" /> {customer.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> {customer.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> {customer.city}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-6">
            <div>
              <div className="text-xs text-slate-400">Lifetime Spend</div>
              <div className="text-xl font-bold text-emerald-400 font-mono">
                ₹{customer.lifetimeSpend?.toLocaleString('en-IN') || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Total Orders</div>
              <div className="text-xl font-bold text-white">
                {customer.totalOrders || orders.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Inactivity</div>
              <div className="text-xl font-bold text-amber-400">
                {daysSinceLastOrder} days
              </div>
            </div>
          </div>
        </div>

        {/* Categories Interests */}
        {customer.categories && customer.categories.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-500" /> Category Affinity:
            </span>
            {customer.categories.map((cat, idx) => (
              <Badge key={idx} variant="default" size="sm">
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Grid: Order History & Campaign Communications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              Order History ({orders.length})
            </h2>
          </div>

          <div className="space-y-3">
            {orders.length === 0 ? (
              <Card className="text-center py-8 text-slate-400 text-sm">
                No orders recorded for this customer.
              </Card>
            ) : (
              orders.map((o) => (
                <Card key={o._id || o.orderId} className="p-4 bg-slate-900/60 border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-200">
                        {o.orderId}
                      </span>
                      <Badge variant="default" size="sm">{o.category}</Badge>
                    </div>
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      ₹{o.amount?.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="text-slate-300">
                      {o.products && o.products.length > 0
                        ? o.products.map((p) => p.name || p).join(', ')
                        : 'Products'}
                    </span>
                    <span>
                      {o.orderedAt ? new Date(o.orderedAt).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Campaign Touchpoints */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-400" />
              Campaign Touchpoints ({communications.length})
            </h2>
          </div>

          <div className="space-y-3">
            {communications.length === 0 ? (
              <Card className="text-center py-8 text-slate-400 text-sm">
                No campaign messages dispatched to this customer yet.
              </Card>
            ) : (
              communications.map((c) => {
                let badgeVariant = 'default';
                if (['CLICKED', 'CONVERTED'].includes(c.status)) badgeVariant = 'success';
                else if (['DELIVERED', 'READ'].includes(c.status)) badgeVariant = 'info';
                else if (c.status === 'FAILED') badgeVariant = 'danger';

                return (
                  <Card key={c._id} className="p-4 bg-slate-900/60 border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={badgeVariant} size="sm">{c.status}</Badge>
                        <Badge variant="channel" size="sm">{c.channel?.toUpperCase()}</Badge>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 italic bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                      "{c.message}"
                    </p>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
