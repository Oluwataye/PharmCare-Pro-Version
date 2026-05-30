import React, { useState, useMemo } from 'react';
import { useSession } from './application/context/SessionContext';
import { useInventoryUseCase } from './application/use-cases/useInventoryUseCase';
import { useTransferUseCase } from './application/use-cases/useTransferUseCase';
import { useStaffUseCase } from './application/use-cases/useStaffUseCase';

import { AuthPage } from './components/multi-outlet/AuthPage';
import { OutletSelector } from './components/multi-outlet/OutletSelector';
import { ConsolidatedMetricsGrid } from './components/multi-outlet/ConsolidatedMetricsGrid';
import { ActiveStaffMonitor } from './components/multi-outlet/ActiveStaffMonitor';
import { RegionalDistribution } from './components/multi-outlet/RegionalDistribution';
import { StockTransferModal } from './components/multi-outlet/StockTransferModal';
import { UserManagementPanel } from './components/multi-outlet/UserManagementPanel';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableEmpty } from './components/ui/Table';
import { formatNaira } from './lib/utils';
import { MOCK_BRANCHES } from './data/mock/mockData';
import { 
  Shield, ArrowRightLeft, RotateCw, PlusCircle, 
  CheckCircle, XCircle, Info, Database, LogOut 
} from 'lucide-react';

const App: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    selectedRegionId,
    selectedOutletId,
    logout,
    isSyncing
  } = useSession();

  const { inventory, refetch: refetchInventory } = useInventoryUseCase();
  const { transfers, approveTransfer, rejectTransfer } = useTransferUseCase(refetchInventory);
  const { scrambleStatuses } = useStaffUseCase();

  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Sync / reload triggers
  const handleRefreshAll = () => {
    refetchInventory();
    scrambleStatuses();
  };

  // Get active scoped context name
  const scopeName = useMemo(() => {
    if (selectedOutletId !== 'all') {
      return MOCK_BRANCHES.find(b => b.id === selectedOutletId)?.name || 'Branch';
    }
    if (selectedRegionId !== 'all') {
      return selectedRegionId === 'reg-lagos' ? 'Lagos Zone' : 
             selectedRegionId === 'reg-west' ? 'Western Region' : 
             selectedRegionId === 'reg-north' ? 'Northern Region' : 'Eastern Region';
    }
    return 'Entire Enterprise (Consolidated)';
  }, [selectedRegionId, selectedOutletId]);

  if (!isAuthenticated || !currentUser) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none custom-scrollbar">
      
      {/* Bright Header aligned to original PharmCare Pro UI */}
      <header className="border-b border-border/80 bg-card shadow-sm sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/10">
            <span className="text-xl">🏥</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">PharmCare Pro Enterprise</h1>
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 uppercase font-mono text-[9px] py-0 px-1.5">v2.0-CleanArch</Badge>
            </div>
            <p className="text-xxs uppercase tracking-wider text-muted-foreground mt-0.5">Pharmaceutical Governance Hub</p>
          </div>
        </div>

        {/* Secure User Navigation Console */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-slate-100/50 text-xxs text-muted-foreground uppercase font-semibold">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Active User:</span>
            <span className="text-slate-800 font-bold">{currentUser.name}</span>
            <Badge variant={currentUser.role === 'SUPER_ADMIN' ? 'destructive' : currentUser.role === 'REGIONAL_MANAGER' ? 'info' : 'primary'} className="text-[8px] tracking-wider py-0 px-1 font-mono uppercase scale-95 shrink-0">
              {currentUser.role.replace('_', ' ')}
            </Badge>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout} 
            className="gap-1.5 h-8 text-[10px] uppercase tracking-wider text-destructive hover:bg-destructive/10 border-destructive/20 bg-card"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </Button>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefreshAll} 
            disabled={isSyncing}
            className="flex-shrink-0 bg-card border-border"
            aria-label="Refresh live data feeds"
          >
            <RotateCw className={`h-4.5 w-4.5 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main Workspace Workspace */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Scoped selection control */}
        <OutletSelector />

        {/* Consolidated key stats display */}
        <ConsolidatedMetricsGrid />

        {/* Governance controls panel (Super Admin/Regional Manager only) */}
        <UserManagementPanel />

        {/* Layout Row 1: Distribution Map and Stock Transfer logs */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RegionalDistribution />
          </div>

          {/* Transfers log visual card */}
          <Card className="border border-border bg-card shadow-sm flex flex-col">
            <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold uppercase tracking-wider text-foreground">
                  Stock Transfer Ledger
                </CardTitle>
                <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                  Location Relocations
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-1.5 h-8 text-xxs uppercase tracking-wider border-primary/20 text-primary hover:bg-primary/5 bg-card"
                onClick={() => setIsTransferOpen(true)}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Request
              </Button>
            </CardHeader>
            
            <CardContent className="p-4 flex-1 overflow-y-auto max-h-[360px] custom-scrollbar space-y-3">
              {transfers.map((tx) => {
                const isPending = tx.status === 'pending';
                const isApproved = tx.status === 'received';
                const canApprove = isPending && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'REGIONAL_MANAGER');

                return (
                  <div 
                    key={tx.id} 
                    className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-2.5"
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
                        <p className="text-xs font-bold text-slate-800 mt-1.5">{tx.productName}</p>
                        <span className="text-xxs font-mono text-muted-foreground">{tx.sku}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-xxs text-muted-foreground uppercase font-semibold">Quantity</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{tx.quantity} units</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xxs text-muted-foreground">
                      <span className="truncate">{tx.sourceBranchName.split(' ')[0]}</span>
                      <ArrowRightLeft className="h-3 w-3 text-muted-foreground/60" />
                      <span className="truncate">{tx.destinationBranchName.split(' ')[0]}</span>
                    </div>

                    {/* Operational controls */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-2 gap-2">
                      <span className="text-xxs text-muted-foreground/60 italic truncate">Req: {tx.requestedByName}</span>
                      <div className="flex gap-1.5">
                        {canApprove && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                              onClick={() => rejectTransfer(tx.id)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button
                              type="button"
                              variant="success"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-success-foreground"
                              onClick={() => approveTransfer(tx.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                          </>
                        )}
                        {!canApprove && isPending && (
                          <span className="text-[10px] text-warning/80 flex items-center gap-1">
                            <Info className="h-3.5 w-3.5" />
                            Awaiting Manager Approval
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-[10px] text-success/80 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Transfer Complete
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

              {transfers.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 border border-dashed border-border/60 rounded-lg">
                  <span className="text-2xl">🚛</span>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">No Transfer Requests</p>
                  <p className="text-xxs text-muted-foreground">Local stock lines are fully balanced.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Layout Row 2: Scoped Inventory sheet and Shift Tracker */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          <div className="lg:col-span-2">
            <Card className="border border-border bg-card shadow-sm">
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
                  <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
                    {inventory.length} Active Records
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
                    {inventory.slice(0, 10).map((item) => {
                      const isLowStock = item.quantity <= item.reorderLevel;
                      const isDepleted = item.quantity === 0;
                      
                      // Check warehouse stock levels in real time for depleted items
                      let warehouseBackupQty: number | undefined;
                      if (isDepleted && item.branchId !== 'br-warehouse') {
                        // Note: in clean arch this calls useInventoryUseCase's mock checker
                        const backup = inventory.find(i => i.sku === item.sku && i.branchId === 'br-warehouse');
                        if (backup) {
                          warehouseBackupQty = backup.quantity;
                        }
                      }

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold text-slate-800 text-xs sm:text-sm">{item.name}</TableCell>
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
                          <TableCell className="text-xs font-mono text-slate-800 font-semibold">{formatNaira(item.price)}</TableCell>
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

                    {inventory.length === 0 && (
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
      <footer className="border-t border-border/80 py-6 px-6 bg-card text-center flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 text-xxs uppercase tracking-wider text-muted-foreground font-medium shadow-inner">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border bg-card">Offline Sync Hub</Badge>
          <span>All nodes linked & encrypted</span>
        </div>
        <p>© 2026 T-Tech PharmCare Group. All rights reserved.</p>
      </footer>

    </div>
  );
};

export default App;
