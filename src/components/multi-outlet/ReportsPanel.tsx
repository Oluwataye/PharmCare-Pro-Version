import React, { useState, useMemo } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { useInventoryUseCase } from '../../application/use-cases/useInventoryUseCase';
import { formatNaira } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  TrendingUp, Package, Calendar, BarChart2,
  ShoppingBag, Activity, AlertCircle
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SubTab = 'sales' | 'top-products' | 'inventory-health' | 'expiry' | 'revenue-branch';

interface BranchSalesData {
  branchId: string;
  branchName: string;
  branchShortName: string;
  regionId: string;
  totalRevenue: number;
  transactions: number;
  avgTicket: number;
  topProduct: string;
  cashPct: number;   // % of revenue via cash
  posPct: number;    // % via POS
  transferPct: number; // % via bank transfer
}

interface TopProduct {
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded simulated sales data (realistic mock values for all 8 retail branches)
// ─────────────────────────────────────────────────────────────────────────────

const SIMULATED_BRANCH_SALES: BranchSalesData[] = [
  {
    branchId: 'br-ikeja',
    branchName: 'Ikeja Outlet',
    branchShortName: 'Ikeja',
    regionId: 'reg-lagos',
    totalRevenue: 4_820_500,
    transactions: 1_243,
    avgTicket: 3_879,
    topProduct: 'Amoxicillin 500mg',
    cashPct: 38, posPct: 47, transferPct: 15,
  },
  {
    branchId: 'br-lekki',
    branchName: 'Lekki Phase 1 Outlet',
    branchShortName: 'Lekki P1',
    regionId: 'reg-lagos',
    totalRevenue: 6_134_200,
    transactions: 1_618,
    avgTicket: 3_791,
    topProduct: 'Atorvastatin 20mg',
    cashPct: 22, posPct: 61, transferPct: 17,
  },
  {
    branchId: 'br-ibadan',
    branchName: 'Ibadan Main Outlet',
    branchShortName: 'Ibadan',
    regionId: 'reg-west',
    totalRevenue: 3_291_000,
    transactions: 910,
    avgTicket: 3_617,
    topProduct: 'Artemether-Lumefantrine',
    cashPct: 55, posPct: 35, transferPct: 10,
  },
  {
    branchId: 'br-abeokuta',
    branchName: 'Abeokuta Express Outlet',
    branchShortName: 'Abeokuta',
    regionId: 'reg-west',
    totalRevenue: 1_987_450,
    transactions: 612,
    avgTicket: 3_248,
    topProduct: 'Paracetamol 500mg',
    cashPct: 61, posPct: 29, transferPct: 10,
  },
  {
    branchId: 'br-abuja-wuse',
    branchName: 'Wuse II Premium Outlet',
    branchShortName: 'Wuse II',
    regionId: 'reg-north',
    totalRevenue: 7_410_800,
    transactions: 1_892,
    avgTicket: 3_917,
    topProduct: 'Atorvastatin 20mg',
    cashPct: 18, posPct: 65, transferPct: 17,
  },
  {
    branchId: 'br-kano',
    branchName: 'Kano Commercial Outlet',
    branchShortName: 'Kano',
    regionId: 'reg-north',
    totalRevenue: 2_655_300,
    transactions: 778,
    avgTicket: 3_413,
    topProduct: 'Ciprofloxacin 500mg',
    cashPct: 64, posPct: 26, transferPct: 10,
  },
  {
    branchId: 'br-enugu',
    branchName: 'Enugu Urban Outlet',
    branchShortName: 'Enugu',
    regionId: 'reg-east',
    totalRevenue: 2_112_600,
    transactions: 631,
    avgTicket: 3_348,
    topProduct: 'Metformin 500mg',
    cashPct: 52, posPct: 36, transferPct: 12,
  },
  {
    branchId: 'br-port-harcourt',
    branchName: 'PH GRA Outlet',
    branchShortName: 'PH GRA',
    regionId: 'reg-east',
    totalRevenue: 3_589_750,
    transactions: 988,
    avgTicket: 3_633,
    topProduct: 'Omeprazole 20mg',
    cashPct: 44, posPct: 42, transferPct: 14,
  },
];

const SIMULATED_TOP_PRODUCTS: TopProduct[] = [
  { name: 'Amoxicillin 500mg',               sku: 'MED-AMX-500', unitsSold: 4_812, revenue: 16_842_000 },
  { name: 'Paracetamol 500mg',               sku: 'MED-PCM-500', unitsSold: 9_344, revenue:  4_672_000 },
  { name: 'Atorvastatin 20mg',               sku: 'MED-ATO-020', unitsSold: 1_923, revenue: 12_499_500 },
  { name: 'Artemether-Lumefantrine',         sku: 'MED-COA-024', unitsSold: 3_210, revenue:  8_988_000 },
  { name: 'Metformin 500mg',                 sku: 'MED-MET-500', unitsSold: 5_110, revenue:  9_198_000 },
  { name: 'Ciprofloxacin 500mg',             sku: 'MED-CIP-500', unitsSold: 2_645, revenue: 11_109_000 },
  { name: 'Ibuprofen 400mg',                 sku: 'MED-IBU-400', unitsSold: 6_703, revenue:  5_362_400 },
  { name: 'Omeprazole 20mg',                 sku: 'MED-OME-020', unitsSold: 4_088, revenue:  4_905_600 },
];

// Gradient shades from blue-600 → indigo-700 for bar chart cells
const BAR_COLORS = [
  '#2563eb', '#2f6de0', '#3b77d4', '#4681c9',
  '#5470be', '#5e60b3', '#6650a4', '#4f46e5',
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab config
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'sales',            label: 'Sales Summary',       icon: ShoppingBag  },
  { id: 'top-products',     label: 'Top Products',        icon: TrendingUp   },
  { id: 'inventory-health', label: 'Inventory Health',    icon: Package      },
  { id: 'expiry',           label: 'Expiry Tracker',      icon: Calendar     },
  { id: 'revenue-branch',   label: 'Revenue by Branch',   icon: BarChart2    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const expiry = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Custom tooltip for Recharts
const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
        <p className="text-slate-300 font-semibold mb-1">{label}</p>
        <p className="text-white font-bold">{formatNaira(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ReportsPanel: React.FC = () => {
  const { branches, selectedOutletId, selectedRegionId } = useSession();
  const { rawInventory, isLoading } = useInventoryUseCase();

  const [activeTab, setActiveTab] = useState<SubTab>('sales');

  // ── Scope: filter inventory by selection ──────────────────────────────────
  const scopedInventory = useMemo(() => {
    if (selectedOutletId !== 'all') {
      return rawInventory.filter(i => i.branchId === selectedOutletId);
    }
    if (selectedRegionId !== 'all') {
      const regionBranchIds = branches
        .filter(b => b.regionId === selectedRegionId)
        .map(b => b.id);
      return rawInventory.filter(i => regionBranchIds.includes(i.branchId));
    }
    return rawInventory;
  }, [rawInventory, selectedOutletId, selectedRegionId, branches]);

  // Scoped branch IDs (retail only for sales data)
  const scopedBranchIds = useMemo(() => {
    if (selectedOutletId !== 'all') return [selectedOutletId];
    if (selectedRegionId !== 'all') {
      return branches
        .filter(b => b.regionId === selectedRegionId && b.type !== 'warehouse')
        .map(b => b.id);
    }
    return branches.filter(b => b.type !== 'warehouse').map(b => b.id);
  }, [selectedOutletId, selectedRegionId, branches]);

  const scopedSalesData = useMemo(
    () => SIMULATED_BRANCH_SALES.filter(s => scopedBranchIds.includes(s.branchId)),
    [scopedBranchIds]
  );

  // ── Tab 3 – Inventory Health KPIs ────────────────────────────────────────
  const inventoryHealthStats = useMemo(() => {
    // Exclude warehouse from health reporting
    const items = scopedInventory.filter(i => i.branchId !== 'br-warehouse');
    let inStock = 0, lowStock = 0, critical = 0, outOfStock = 0;
    items.forEach(item => {
      if (item.quantity === 0) {
        outOfStock++;
      } else if (item.quantity <= item.reorderLevel * 0.25) {
        critical++;
      } else if (item.quantity <= item.reorderLevel) {
        lowStock++;
      } else {
        inStock++;
      }
    });
    return { inStock, lowStock, critical, outOfStock, total: items.length };
  }, [scopedInventory]);

  // ── Tab 4 – Expiry Tracker ────────────────────────────────────────────────
  const expiryItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 180);

    return scopedInventory
      .filter(item => {
        if (!item.expiryDate) return false;
        const expiry = new Date(item.expiryDate);
        return expiry <= cutoff;
      })
      .map(item => ({
        ...item,
        branchName: branches.find(b => b.id === item.branchId)?.name ?? item.branchId,
        daysRemaining: daysUntil(item.expiryDate!),
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [scopedInventory, branches]);

  // ── Revenue by branch chart data ──────────────────────────────────────────
  const revenueBranchChartData = useMemo(() =>
    scopedSalesData.map(s => ({
      name: s.branchShortName,
      revenue: s.totalRevenue,
    })),
    [scopedSalesData]
  );

  const totalScopedRevenue = useMemo(
    () => scopedSalesData.reduce((sum, s) => sum + s.totalRevenue, 0),
    [scopedSalesData]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const getInventoryStatusBadge = (item: typeof scopedInventory[0]) => {
    if (item.quantity === 0) {
      return <Badge variant="destructive" className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wide">Out of Stock</Badge>;
    }
    if (item.quantity <= item.reorderLevel * 0.25) {
      return <Badge variant="destructive" className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wide">Critical</Badge>;
    }
    if (item.quantity <= item.reorderLevel) {
      return <Badge variant="warning" className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wide">Low Stock</Badge>;
    }
    return <Badge variant="success" className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wide">In Stock</Badge>;
  };

  const getExpiryBadge = (days: number) => {
    if (days <= 0) {
      return <Badge variant="destructive" className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wide">Expired</Badge>;
    }
    if (days <= 30) {
      return <Badge variant="destructive" className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wide">Critical ≤30d</Badge>;
    }
    if (days <= 60) {
      return <Badge variant="warning" className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wide">Urgent ≤60d</Badge>;
    }
    if (days <= 90) {
      return (
        <Badge className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wide bg-yellow-500/15 text-yellow-500 border-yellow-500/20">
          Watch ≤90d
        </Badge>
      );
    }
    return <Badge variant="success" className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wide">Safe &gt;90d</Badge>;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Activity className="h-8 w-8 text-primary animate-pulse" />
        <p className="text-xxs uppercase tracking-widest text-muted-foreground font-semibold">
          Compiling analytics data…
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Panel Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
          Reports &amp; Analytics
        </h2>
        <p className="text-xxs text-muted-foreground uppercase tracking-widest leading-normal">
          Enterprise-wide performance intelligence — sales, inventory, expiry &amp; branch comparison.
        </p>
      </div>

      {/* ── Pill Sub-Tab Navigation ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap p-1 rounded-xl bg-slate-100/80 border border-border/40 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xxs font-bold uppercase tracking-wider transition-all duration-150 select-none',
                isActive
                  ? 'bg-white text-primary shadow-sm border border-primary/20 ring-1 ring-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/60',
              ].join(' ')}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 — SALES SUMMARY
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <Card className="border border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Branch Sales Summary
                  </CardTitle>
                  <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                    Revenue, ticket sizes &amp; payment split by outlet
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 uppercase font-mono text-[9px]">
                  {scopedSalesData.length} Branches
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {scopedSalesData.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  message="No sales data for current scope"
                  description="Adjust the outlet or region selector to view sales data."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-border/40">
                      <tr>
                        {['Branch', 'Total Revenue', 'Transactions', 'Avg Ticket', 'Top Product', 'Payment Split'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xxs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scopedSalesData.map((row, idx) => (
                        <tr
                          key={row.branchId}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                        >
                          {/* Branch */}
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                            {row.branchName}
                          </td>
                          {/* Total Revenue */}
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatNaira(row.totalRevenue)}
                          </td>
                          {/* Transactions */}
                          <td className="px-4 py-3 font-mono text-slate-700 tabular-nums">
                            {row.transactions.toLocaleString()}
                          </td>
                          {/* Avg Ticket */}
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {formatNaira(row.avgTicket)}
                          </td>
                          {/* Top Product */}
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            <span className="inline-block max-w-[140px] truncate" title={row.topProduct}>
                              {row.topProduct}
                            </span>
                          </td>
                          {/* Payment Split */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-mono bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 whitespace-nowrap">
                                Cash {row.cashPct}%
                              </span>
                              <span className="text-[9px] font-mono bg-primary/5 border border-primary/20 rounded px-1.5 py-0.5 text-primary whitespace-nowrap">
                                POS {row.posPct}%
                              </span>
                              <span className="text-[9px] font-mono bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 text-indigo-600 whitespace-nowrap">
                                Xfer {row.transferPct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals footer */}
                    <tfoot className="border-t-2 border-border/60 bg-primary/5">
                      <tr>
                        <td className="px-4 py-3 text-xxs font-black uppercase tracking-wider text-primary">
                          Total
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-primary text-sm">
                          {formatNaira(totalScopedRevenue)}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {scopedSalesData.reduce((s, r) => s + r.transactions, 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {formatNaira(
                            Math.round(totalScopedRevenue /
                              Math.max(1, scopedSalesData.reduce((s, r) => s + r.transactions, 0)))
                          )}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — TOP PRODUCTS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'top-products' && (
        <div className="space-y-4">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/20">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                Top Selling Products by Revenue
              </CardTitle>
              <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                Enterprise-wide revenue contribution per product line
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 pb-2">
              {/* Bar Chart */}
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={SIMULATED_TOP_PRODUCTS}
                    margin={{ top: 8, right: 16, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      angle={-38}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `₦${(v / 1_000_000).toFixed(1)}M`}
                      tick={{ fontSize: 9, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={52}>
                      {SIMULATED_TOP_PRODUCTS.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Summary grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SIMULATED_TOP_PRODUCTS.map((p, i) => (
              <div
                key={p.sku}
                className="rounded-xl border border-border/40 bg-card p-3.5 shadow-sm space-y-1"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                  />
                  <span className="text-xxs font-mono text-muted-foreground uppercase truncate" title={p.sku}>
                    {p.sku}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2" title={p.name}>
                  {p.name}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {p.unitsSold.toLocaleString()} units sold
                </p>
                <p className="text-xs font-mono font-black text-primary">
                  {formatNaira(p.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3 — INVENTORY HEALTH
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'inventory-health' && (
        <div className="space-y-4">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="In Stock"
              value={inventoryHealthStats.inStock}
              colorClass="text-success border-success/20 bg-success/5"
              dotColor="bg-success"
            />
            <KpiCard
              label="Low Stock"
              value={inventoryHealthStats.lowStock}
              colorClass="text-warning border-warning/20 bg-warning/5"
              dotColor="bg-warning"
            />
            <KpiCard
              label="Critical"
              value={inventoryHealthStats.critical}
              colorClass="text-orange-500 border-orange-400/20 bg-orange-400/5"
              dotColor="bg-orange-500"
            />
            <KpiCard
              label="Out of Stock"
              value={inventoryHealthStats.outOfStock}
              colorClass="text-destructive border-destructive/20 bg-destructive/5"
              dotColor="bg-destructive"
            />
          </div>

          {/* Inventory Table */}
          <Card className="border border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Stock Status Ledger
                  </CardTitle>
                  <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                    All inventory items within the current scope
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 uppercase font-mono text-[9px]">
                  {inventoryHealthStats.total} Items
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {inventoryHealthStats.total === 0 ? (
                <EmptyState
                  icon={Package}
                  message="No inventory items in scope"
                  description="Select a broader outlet or region to view stock."
                />
              ) : (
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-border/40">
                      <tr>
                        {['Product', 'SKU', 'Branch', 'Category', 'Qty', 'Reorder Lvl', 'Status'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xxs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scopedInventory
                        .filter(i => i.branchId !== 'br-warehouse')
                        .map((item, idx) => {
                          const branchName = branches.find(b => b.id === item.branchId)?.name ?? item.branchId;
                          return (
                            <tr
                              key={item.id}
                              className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                            >
                              <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{item.name}</td>
                              <td className="px-4 py-3 font-mono text-xxs text-muted-foreground">{item.sku}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-[11px]">{branchName}</td>
                              <td className="px-4 py-3 text-slate-500">{item.category}</td>
                              <td className={[
                                'px-4 py-3 font-mono font-bold tabular-nums',
                                item.quantity === 0 ? 'text-destructive' :
                                item.quantity <= item.reorderLevel * 0.25 ? 'text-orange-500' :
                                item.quantity <= item.reorderLevel ? 'text-warning' : 'text-success'
                              ].join(' ')}>
                                {item.quantity}
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-500 tabular-nums">{item.reorderLevel}</td>
                              <td className="px-4 py-3">{getInventoryStatusBadge(item)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4 — EXPIRY TRACKER
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'expiry' && (
        <div className="space-y-4">

          {/* Expiry legend */}
          <div className="flex items-center gap-3 flex-wrap p-3.5 rounded-xl border border-border/40 bg-card shadow-sm">
            <span className="text-xxs font-bold uppercase tracking-wider text-muted-foreground mr-1">Legend:</span>
            {[
              { label: 'Critical (≤ 30 days)', cls: 'bg-destructive/15 text-destructive border-destructive/20' },
              { label: 'Urgent (≤ 60 days)',   cls: 'bg-warning/15 text-warning border-warning/20' },
              { label: 'Watch (≤ 90 days)',    cls: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/20' },
              { label: 'Safe (> 90 days)',     cls: 'bg-success/15 text-success border-success/20' },
            ].map(l => (
              <span key={l.label} className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full border ${l.cls}`}>
                {l.label}
              </span>
            ))}
          </div>

          <Card className="border border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Expiry Tracker — Next 180 Days
                  </CardTitle>
                  <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                    Sorted by earliest expiry. Items without an expiry date are excluded.
                  </CardDescription>
                </div>
                {expiryItems.some(i => i.daysRemaining <= 30) && (
                  <div className="flex items-center gap-1.5 text-xxs text-destructive font-bold animate-pulse">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Critical items detected
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {expiryItems.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  message="No items expiring within 180 days"
                  description="All products in scope have expiry dates beyond 6 months."
                />
              ) : (
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-border/40">
                      <tr>
                        {['Product', 'SKU', 'Branch', 'Expiry Date', 'Days Remaining', 'Status'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xxs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expiryItems.map((item, idx) => (
                        <tr
                          key={`${item.id}-${item.branchId}`}
                          className={[
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                            item.daysRemaining <= 30 ? 'border-l-2 border-l-destructive/60' :
                            item.daysRemaining <= 60 ? 'border-l-2 border-l-warning/60' : '',
                          ].join(' ')}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{item.name}</td>
                          <td className="px-4 py-3 font-mono text-xxs text-muted-foreground">{item.sku}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-[11px]">{item.branchName}</td>
                          <td className="px-4 py-3 font-mono text-slate-700">{item.expiryDate}</td>
                          <td className={[
                            'px-4 py-3 font-mono font-bold tabular-nums',
                            item.daysRemaining <= 0   ? 'text-destructive' :
                            item.daysRemaining <= 30  ? 'text-destructive' :
                            item.daysRemaining <= 60  ? 'text-warning' :
                            item.daysRemaining <= 90  ? 'text-yellow-500' : 'text-success'
                          ].join(' ')}>
                            {item.daysRemaining <= 0 ? 'EXPIRED' : `${item.daysRemaining}d`}
                          </td>
                          <td className="px-4 py-3">{getExpiryBadge(item.daysRemaining)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 5 — REVENUE BY BRANCH
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'revenue-branch' && (
        <div className="space-y-4">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Revenue by Branch
                  </CardTitle>
                  <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                    Comparative revenue performance across scoped outlets
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">
                    Total Revenue
                  </span>
                  <span className="text-lg font-black font-mono text-primary leading-none">
                    {formatNaira(totalScopedRevenue)}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 pb-4">
              {revenueBranchChartData.length === 0 ? (
                <EmptyState
                  icon={BarChart2}
                  message="No revenue data available"
                  description="Adjust the scope to view branch revenue."
                />
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueBranchChartData}
                      margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(v: number) => `₦${(v / 1_000_000).toFixed(1)}M`}
                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        width={56}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={64}>
                        {revenueBranchChartData.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Branch Revenue breakdown table */}
          {scopedSalesData.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {scopedSalesData
                .slice()
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .map((branch, idx) => {
                  const share = totalScopedRevenue > 0
                    ? ((branch.totalRevenue / totalScopedRevenue) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <div key={branch.branchId} className="rounded-xl border border-border/40 bg-card p-3.5 shadow-sm space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-black text-muted-foreground bg-slate-100 rounded px-1 py-0.5 uppercase">
                          #{idx + 1}
                        </span>
                        <span
                          className="inline-block h-2 w-2 rounded-sm shrink-0"
                          style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
                        />
                      </div>
                      <p className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2" title={branch.branchName}>
                        {branch.branchName}
                      </p>
                      <p className="text-xs font-mono font-black text-primary">
                        {formatNaira(branch.totalRevenue)}
                      </p>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${share}%`,
                            backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                          }}
                        />
                      </div>
                      <p className="text-[9px] font-mono text-muted-foreground">
                        {share}% of total
                      </p>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Local sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  colorClass: string;
  dotColor: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, colorClass, dotColor }) => (
  <div className={`rounded-xl border p-4 shadow-sm flex flex-col gap-1 ${colorClass}`}>
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      <span className="text-xxs font-bold uppercase tracking-wider opacity-70">{label}</span>
    </div>
    <p className="text-3xl font-black font-mono leading-none">{value}</p>
    <p className="text-xxs font-semibold opacity-60 uppercase tracking-wide">SKUs</p>
  </div>
);

interface EmptyStateProps {
  icon: React.ElementType;
  message: string;
  description: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, message, description }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center">
    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
      <Icon className="h-5 w-5 text-muted-foreground/60" />
    </div>
    <p className="text-sm font-bold text-slate-700">{message}</p>
    <p className="text-xxs text-muted-foreground max-w-xs leading-relaxed">{description}</p>
  </div>
);
