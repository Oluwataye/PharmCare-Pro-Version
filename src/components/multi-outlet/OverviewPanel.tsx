import React from 'react';
import { ConsolidatedMetricsGrid } from './ConsolidatedMetricsGrid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { ShoppingBag, Terminal, CreditCard, Zap, Receipt } from 'lucide-react';

interface OverviewPanelProps {
  /** Optional callback to navigate user to the Sales & Ops (POS) panel */
  onNavigateToPOS?: () => void;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({ onNavigateToPOS }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Overview Dashboard Banner */}
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
          Enterprise Operations Overview
        </h2>
        <p className="text-xxs text-muted-foreground uppercase tracking-widest leading-normal">
          Real-time metrics consolidation across all outlets. Open Sales &amp; Ops to access the POS terminal.
        </p>
      </div>

      {/* Consolidated KPI grid */}
      <ConsolidatedMetricsGrid />

      {/* POS Terminal Quick-Access Card */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* POS Terminal Feature Card */}
        <div className="lg:col-span-2">
          <Card className="border border-border bg-card shadow-sm overflow-hidden relative">
            {/* Decorative gradient stripe */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-cyan-400 rounded-t-xl" />

            <CardHeader className="pb-4 pt-6 border-b border-border/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Terminal className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                    POS Checkout Terminal
                  </CardTitle>
                  <CardDescription className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                    Full-featured multi-outlet point-of-sale system
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">

              {/* Feature capability grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: <ShoppingBag className="h-4 w-4 text-emerald-600" />,
                    bg: 'bg-emerald-50 border-emerald-100',
                    title: 'Smart Cart',
                    desc: 'Up to 15 unique items with live stock validation, ± qty controls, and auto-persist cart session recovery via IndexedDB.'
                  },
                  {
                    icon: <CreditCard className="h-4 w-4 text-primary" />,
                    bg: 'bg-primary/5 border-primary/10',
                    title: 'Multi-Payment Gateway',
                    desc: 'Accept Cash, POS terminal, and Bank Transfer payments. Apply discount coupon codes with branch-scoped validation.'
                  },
                  {
                    icon: <Receipt className="h-4 w-4 text-violet-600" />,
                    bg: 'bg-violet-50 border-violet-100',
                    title: 'Receipt & Audit Trail',
                    desc: 'Auto-print receipt modal on checkout. Full receipts ledger with reprint support and cash drawer reconciliation.'
                  },
                  {
                    icon: <Zap className="h-4 w-4 text-amber-500" />,
                    bg: 'bg-amber-50 border-amber-100',
                    title: 'Offline Draft Saving',
                    desc: 'Suspend incomplete transactions as drafts in IndexedDB. Resume exactly where you left off — even after a page refresh.'
                  },
                  {
                    icon: <Terminal className="h-4 w-4 text-cyan-600" />,
                    bg: 'bg-cyan-50 border-cyan-100',
                    title: 'Customer & Rx Capture',
                    desc: 'Record customer profiles, prescription IDs, doctor names, dosage instructions, and billing notes for compliance.'
                  },
                  {
                    icon: <ShoppingBag className="h-4 w-4 text-rose-500" />,
                    bg: 'bg-rose-50 border-rose-100',
                    title: 'Multi-Outlet Simulation',
                    desc: 'Managers can operate any branch register via simulation mode — full checkout capability without outlet switching.'
                  },
                ].map(({ icon, bg, title, desc }) => (
                  <div
                    key={title}
                    className={`p-3.5 rounded-xl border ${bg} flex flex-col gap-2`}
                  >
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">{title}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              {onNavigateToPOS && (
                <div className="pt-2 border-t border-border/30 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-[10px] text-muted-foreground">
                    Select a branch outlet from the top navigation, then open Sales &amp; Ops to start a checkout session.
                  </p>
                  <button
                    type="button"
                    onClick={onNavigateToPOS}
                    className="inline-flex items-center gap-2 h-8 px-4 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-all duration-150 shadow-sm hover:shadow-primary/20"
                    aria-label="Open POS Checkout Terminal in Sales and Ops"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    Open POS Terminal
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick stats sidebar */}
        <div className="lg:col-span-1">
          <Card className="border border-border bg-card shadow-sm h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-border/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                POS System Highlights
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
                What the terminal supports
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              <ul className="space-y-3" role="list">
                {[
                  { label: 'Max cart items', value: '15 unique SKUs' },
                  { label: 'Payment methods', value: 'Cash · POS · Transfer' },
                  { label: 'Offline draft storage', value: 'IndexedDB (no expiry)' },
                  { label: 'Cart session recovery', value: 'Auto on page reload' },
                  { label: 'Discount codes', value: 'Branch-scoped coupons' },
                  { label: 'Receipt reprinting', value: 'Full audit ledger' },
                  { label: 'Customer capture', value: 'Profile + Rx details' },
                  { label: 'Drawer reconciliation', value: 'Per-session tracking' },
                ].map(({ label, value }) => (
                  <li key={label} className="flex items-center justify-between gap-2 text-xxs border-b border-border/20 pb-2 last:border-0 last:pb-0">
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className="font-bold text-slate-800 text-right font-mono text-[9px]">{value}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
};
