import React, { useState, useMemo } from 'react';
import { useMultiOutlet } from './contexts/MultiOutletContext';
import { OutletSelector } from './components/multi-outlet/OutletSelector';
import { ConsolidatedMetricsGrid } from './components/multi-outlet/ConsolidatedMetricsGrid';
import { ActiveStaffMonitor } from './components/multi-outlet/ActiveStaffMonitor';
import { RegionalDistribution } from './components/multi-outlet/RegionalDistribution';
import { StockTransferModal } from './components/multi-outlet/StockTransferModal';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableEmpty } from './components/ui/Table';
import { formatNaira } from './lib/utils';
import { 
  Shield, ArrowRightLeft, 
  RotateCw, PlusCircle, CheckCircle, XCircle, Info, Database 
} from 'lucide-react';

const App: React.FC = () => {
  const {
    branches,
    regions,
    inventory,
    transfers,
    currentUser,
    currentRole,
    selectedRegionId,
    selectedOutletId,
    changeRole,
    approveStockTransfer,
    cancelStockTransfer,
    queryCentralWarehouseStock,
    isSyncing,
    refetchData
  } = useMultiOutlet();

  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // 1. Scoped Inventory calculation
  const scopedInventory = useMemo(() => {
    let list = inventory;
    if (selectedOutletId !== 'all') {
      list = inventory.filter(i => i.branchId === selectedOutletId);
    } else if (selectedRegionId !== 'all') {
      const regionBranchIds = branches.filter(b => b.regionId === selectedRegionId).map(b => b.id);
      list = inventory.filter(i => regionBranchIds.includes(i.branchId));
    }
    
    // Sort so depleted low-stock items appear first to prompt transfer actions
    return [...list].sort((a, b) => a.quantity - b.quantity);
  }, [inventory, selectedRegionId, selectedOutletId, branches]);

  // 2. Scoped Stock Transfers list (show incoming transfers for branch, or all for global admins)
  const scopedTransfers = useMemo(() => {
    if (currentUser.role === 'SUPER_ADMIN') return transfers;
    
    if (currentUser.role === 'REGIONAL_MANAGER') {
      const assignedIds = currentUser.assignedRegionIds || [];
      const regionBranchIds = branches.filter(b => assignedIds.includes(b.regionId)).map(b => b.id);
      return transfers.filter(t => regionBranchIds.includes(t.sourceBranchId) || regionBranchIds.includes(t.destinationBranchId));
    }

    // Admins and staff only see transfers relating to their branch
    return transfers.filter(t => t.sourceBranchId === currentUser.branchId || t.destinationBranchId === currentUser.branchId);
  }, [transfers, currentUser, branches]);

  // Get active branch name
  const scopeName = useMemo(() => {
    if (selectedOutletId !== 'all') {
      return branches.find(b => b.id === selectedOutletId)?.name || 'Branch';
    }
    if (selectedRegionId !== 'all') {
      return regions.find(r => r.id === selectedRegionId)?.name || 'Region';
    }
    return 'Entire Enterprise (Consolidated)';
  }, [selectedRegionId, selectedOutletId, branches, regions]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans select-none custom-scrollbar">
      
      {/* Premium Header */}
      <header className="border-b border-border/40 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-xl">🏥</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground tracking-tight text-glow-primary">PharmCare Pro Enterprise</h1>
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 uppercase font-mono text-[9px] py-0 px-1.5">v1.2.0-MultiOutlet</Badge>
            </div>
            <p className="text-xxs uppercase tracking-wider text-muted-foreground mt-0.5">Production Wholesale & Retail Hub</p>
          </div>
        </div>

        {/* Role Simulator Controller */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/30 bg-slate-900/40 text-xxs text-muted-foreground uppercase font-semibold">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Simulated Role:</span>
            <span className="text-foreground text-glow-primary">{currentUser.name} ({currentUser.role})</span>
          </div>

          <div className="flex gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-border/30">
            {(['SUPER_ADMIN', 'REGIONAL_MANAGER', 'ADMIN', 'DISPENSER'] as const).map((role) => (
              <button
                key={role}
                onClick={() => changeRole(role)}
                className={`px-2.5 py-1 rounded text-xxs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  currentRole === role
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                }`}
              >
                {role.replace('_', ' ')}
              </button>
            ))}
          </div>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={refetchData} 
            disabled={isSyncing}
            className="flex-shrink-0"
            aria-label="Refresh live data feeds"
          >
            <RotateCw className={`h-4.5 w-4.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Scoped Filter selector widget */}
        <OutletSelector />

        {/* Aggregate statistics row */}
        <ConsolidatedMetricsGrid />

        {/* Grid: Map visualizer & pending transfers */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map Node Distribution */}
          <div className="lg:col-span-2">
            <RegionalDistribution />
          </div>

          {/* Core transfers approvals ledger */}
          <Card className="border border-border/30 bg-slate-900/40 backdrop-blur-md flex flex-col">
            <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold uppercase tracking-wider text-foreground">
                  Stock Transfer Ledger
                </CardTitle>
                <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                  Regional Stock Relocations
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-1.5 h-8 text-xxs uppercase tracking-wider border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => setIsTransferOpen(true)}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Request
              </Button>
            </CardHeader>
            
            <CardContent className="p-4 flex-1 overflow-y-auto max-h-[360px] custom-scrollbar space-y-3">
              {scopedTransfers.map((tx) => {
                const isPending = tx.status === 'pending';
                const isApproved = tx.status === 'received';
                const canApprove = isPending && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'REGIONAL_MANAGER');

                return (
                  <div 
                    key={tx.id} 
                    className="p-3 rounded-lg border border-border/40 bg-slate-950/60 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge 
                          variant={
                            tx.status === 'pending' ? 'warning' : 
                            tx.status === 'received' ? 'success' : 
                            tx.status === 'in_transit' ? 'primary' : 'secondary'
                          }
                          className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0"
                          pulse={tx.status === 'pending' || tx.status === 'in_transit'}
                        >
                          {tx.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs font-bold text-foreground mt-1.5">{tx.productName}</p>
                        <span className="text-xxs font-mono text-muted-foreground">{tx.sku}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-xxs text-muted-foreground uppercase font-semibold">Quantity</span>
                        <span className="text-sm font-bold text-foreground font-mono">{tx.quantity} units</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xxs text-muted-foreground">
                      <span className="truncate">{tx.sourceBranchName.split(' ')[0]}</span>
                      <ArrowRightLeft className="h-3 w-3 text-muted-foreground/60" />
                      <span className="truncate">{tx.destinationBranchName.split(' ')[0]}</span>
                    </div>

                    {/* Operational controls */}
                    <div className="flex items-center justify-between border-t border-border/20 pt-2 gap-2">
                      <span className="text-xxs text-muted-foreground/60 italic truncate">Req: {tx.requestedByName}</span>
                      <div className="flex gap-1.5">
                        {canApprove && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-glow-primary text-[10px] text-destructive hover:bg-destructive/10"
                              onClick={() => cancelStockTransfer(tx.id)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button
                              variant="success"
                              size="sm"
                              className="h-6 px-2 text-glow-primary text-[10px] text-success-foreground"
                              onClick={() => approveStockTransfer(tx.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                          </>
                        )}
                        {!canApprove && isPending && (
                          <span className="text-[10px] text-warning/70 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Awaiting Manager Approval
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-[10px] text-success/70 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Transfer Complete
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

              {scopedTransfers.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 border border-dashed border-border/30 rounded-lg">
                  <span className="text-2xl">🚛</span>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">No Transfer Requests</p>
                  <p className="text-xxs text-muted-foreground">Local stock lines are fully balanced.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scoped Inventory Grid & Live Concurrency lists */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Detailed scoped inventory status table */}
          <div className="lg:col-span-2">
            <Card className="border border-border/30 bg-slate-900/40 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-border/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold uppercase tracking-wider text-foreground">
                      Branch Stock Sheet
                    </CardTitle>
                    <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                      Scope: {scopeName}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-primary/20 text-primary">
                    {scopedInventory.length} Active Records
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Local Stock</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Automated Backup Query</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scopedInventory.slice(0, 10).map((item) => {
                      const isLowStock = item.quantity <= item.reorderLevel;
                      const isDepleted = item.quantity === 0;
                      
                      // Auto check warehouse stock for depleted items
                      let warehouseBackupQty: number | undefined;
                      if (isDepleted && item.branchId !== 'br-warehouse') {
                        const backup = queryCentralWarehouseStock(item.sku);
                        if (backup) {
                          warehouseBackupQty = backup.quantity;
                        }
                      }

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold text-foreground text-xs sm:text-sm">{item.name}</TableCell>
                          <TableCell className="font-mono text-xxs text-muted-foreground">{item.sku}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.category}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={`font-bold font-mono text-xs ${
                                isDepleted ? 'text-destructive' :
                                isLowStock ? 'text-warning' : 'text-success'
                              }`}>
                                {item.quantity} units
                              </span>
                              <span className="text-[9px] text-muted-foreground uppercase">Reorder Lvl: {item.reorderLevel}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-foreground font-semibold">{formatNaira(item.price)}</TableCell>
                          <TableCell>
                            {warehouseBackupQty !== undefined ? (
                              <div className="flex items-center gap-1.5">
                                <Database className="h-3 w-3 text-success animate-pulse" />
                                <Badge variant="success" className="font-mono text-[9px] px-1 py-0 select-none">
                                  WHSE: {warehouseBackupQty}
                                </Badge>
                              </div>
                            ) : isDepleted && item.branchId === 'br-warehouse' ? (
                              <Badge variant="destructive" className="font-mono text-[9px] px-1 py-0 select-none">Warehouse Depleted</Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/40 italic">Local stock OK</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {scopedInventory.length === 0 && (
                      <TableEmpty 
                        columnsCount={6} 
                        message="No products found in this branch" 
                        description="This branch currently has no catalog items initialized."
                      />
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Active staff session tracker */}
          <div className="lg:col-span-1">
            <ActiveStaffMonitor />
          </div>

        </div>

      </main>

      {/* Stock Transfer Form Modal */}
      <StockTransferModal 
        isOpen={isTransferOpen} 
        onClose={() => setIsTransferOpen(false)} 
      />

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 px-6 bg-slate-950/40 text-center flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 text-xxs uppercase tracking-wider text-muted-foreground font-medium">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border">Offline Sync Hub</Badge>
          <span>All nodes linked & encrypted</span>
        </div>
        <p>© 2026 T-Tech PharmCare Group. All rights reserved.</p>
      </footer>

    </div>
  );
};

export default App;
