import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Rocket,
  LayoutDashboard,
  Users,
  Layers,
  Send,
  Sparkles,
  Radio,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Segments', path: '/segments', icon: Layers },
  { label: 'Campaigns', path: '/campaigns', icon: Send },
  { label: 'AI Builder', path: '/campaigns/new', icon: Sparkles, badge: 'AI-Native' }
];

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl flex flex-col flex-shrink-0 z-40">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                CampaignPilot
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                AI-Native Shopper CRM
              </div>
            </div>
          </NavLink>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 flex-1 flex flex-col gap-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Platform Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System Status Footprint */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/40">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex flex-col gap-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Simulator Service
              </span>
              <span className="text-emerald-400 font-semibold text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                ACTIVE :5001
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-mono">Backend Engine</span>
              <span className="text-indigo-400 font-semibold text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                ACTIVE :5000
              </span>
            </div>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
              Zero LLM-to-DB writes • Zod validated
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
