import React, { useMemo } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { useInventoryUseCase } from '../../application/use-cases/useInventoryUseCase';
import { useStaffUseCase } from '../../application/use-cases/useStaffUseCase';
import { generateMockSalesReports } from '../../data/mock/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatNaira } from '../../lib/utils';
import { 
  TrendingUp, ShoppingBag, Users, AlertTriangle, 
  Warehouse, ArrowRightLeft, DatabaseZap 
} from 'lucide-react';

const MOCK_SALES_REPORTS = generateMockSalesReports();

export const ConsolidatedMetricsGrid: React.FC = () => {
  const { selectedRegionId, selectedOutletId, branches } = useSession();
  const { inventory, rawInventory } = useInventoryUseCase();
  const { activeStaffInScope } = useStaffUseCase();

  // 1. Calculate scoped metrics
  const stats = useMemo(() => {
    // Filter sales logs
    let filteredReports = MOCK_SALES_REPORTS;
    if (selectedOutletId !== 'all') {
      filteredReports = MOCK_SALES_REPORTS.filter(r => r.branchId === selectedOutletId);
    } else if (selectedRegionId !== 'all') {
      const regionBranchIds = branches.filter(b => b.regionId === selectedRegionId).map(b => b.id);
      filteredReports = MOCK_SALES_REPORTS.filter(r => regionBranchIds.includes(r.branchId));
    }

    // Sum revenue and transactions
    const totalSales = filteredReports.reduce((sum, r) => sum + r.totalSales, 0);
    const totalTx = filteredReports.reduce((sum, r) => sum + r.transactionCount, 0);
    const avgOrderValue = totalTx > 0 ? Math.round(totalSales / totalTx) : 0;

    // Filter local inventory low stock count
    const lowStockItems = inventory.filter(item => item.quantity <= item.reorderLevel);

    // Identify depleted items (Quantity = 0) and check warehouse levels (synchronously using rawInventory)
    const outOfStockItems = inventory.filter(item => item.quantity === 0);
    const warehouseQueries = outOfStockItems.map(item => {
      const warehouseStock = rawInventory.find(i => i.sku === item.sku && i.branchId === 'br-warehouse');
      return {
        productName: item.name,
        sku: item.sku,
        warehouseQty: warehouseStock ? warehouseStock.quantity : 0,
        warehouseId: warehouseStock ? warehouseStock.id : null,
        warehouseBatch: warehouseStock ? warehouseStock.batchNumber : 'N/A'
      };
    });

    return {
      totalSales,
      totalTx,
      avgOrderValue,
      onlineStaff: activeStaffInScope,
      lowStockCount: lowStockItems.length,
      warehouseQueries
    };
  }, [selectedRegionId, selectedOutletId, inventory, rawInventory, activeStaffInScope]);

  const cardsData = [
    {
      title: "Total Revenue",
      value: formatNaira(stats.totalSales),
      icon: TrendingUp,
      desc: "Gross sales for selected scope",
      color: "text-success",
      bg: "bg-success/10 border-success/20"
    },
    {
      title: "Transactions",
      value: stats.totalTx.toLocaleString(),
      icon: ShoppingBag,
      desc: "Processed medicine receipts",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20"
    },
    {
      title: "AOV",
      value: formatNaira(stats.avgOrderValue),
      icon: ArrowRightLeft,
      desc: "Average transaction ticket",
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20"
    },
    {
      title: "Active Staff",
      value: `${stats.onlineStaff} Online`,
      icon: Users,
      desc: "Concurrent shift sessions",
      color: "text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20"
    },
    {
      title: "Low Stock Alarms",
      value: stats.lowStockCount.toString(),
      icon: AlertTriangle,
      desc: "Items below reorder limit",
      color: stats.lowStockCount > 0 ? "text-warning" : "text-success",
      bg: stats.lowStockCount > 0 ? "bg-warning/10 border-warning/20" : "bg-success/10 border-success/20"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cardsData.map((c) => (
          <Card key={c.title} className={`border border-border/30 backdrop-blur-md hover:scale-[1.02] transition-transform`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{c.title}</CardTitle>
              <div className={`p-2 rounded-lg border ${c.bg} ${c.color}`}>
                <c.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">{c.value}</div>
              <p className="text-xxs text-muted-foreground mt-1">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Requirement: Automatically query stock from the central warehouse */}
      {selectedOutletId !== 'br-warehouse' && stats.warehouseQueries.length > 0 && (
        <Card className="border border-warning/30 bg-amber-50/40 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-warning/10 border-b border-warning/20">
            <Warehouse className="h-4.5 w-4.5 text-warning" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-warning flex-1">
              Automated Central Warehouse Sync Queries
            </h3>
            <Badge variant="warning" className="text-glow-primary">
              <DatabaseZap className="h-3 w-3 mr-1 animate-pulse" />
              Active Fallback
            </Badge>
          </div>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              The following products are currently **out of stock** at this outlet. The system has automatically queried the **Central Distribution Warehouse** in real-time to check fallback quantities:
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {stats.warehouseQueries.map((q) => (
                <div 
                  key={q.sku}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-medium text-foreground truncate">{q.productName}</p>
                    <p className="text-xxs text-muted-foreground font-mono">{q.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xxs text-muted-foreground uppercase tracking-wider">Warehouse Stock</p>
                    {q.warehouseQty > 0 ? (
                      <Badge variant="success" className="font-mono mt-0.5">
                        {q.warehouseQty} Available
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="font-mono mt-0.5">
                        Depleted
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
