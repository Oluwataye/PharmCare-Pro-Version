import React, { useState, useMemo } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { useTransferUseCase } from '../../application/use-cases/useTransferUseCase';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { StockTransferModal } from './StockTransferModal';
import { 
  ArrowRightLeft, PlusCircle, CheckCircle, XCircle, 
  Info, Truck 
} from 'lucide-react';

interface LogisticsPanelProps {
  onInventoryMutated?: () => void;
}

export const LogisticsPanel: React.FC<LogisticsPanelProps> = ({ onInventoryMutated }) => {
  const { currentUser } = useSession();
  const { transfers, approveTransfer, rejectTransfer, isLoading } = useTransferUseCase(onInventoryMutated);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTransfers = useMemo(() => {
    if (statusFilter === 'all') return transfers;
    return transfers.filter(t => t.status === statusFilter);
  }, [transfers, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
            Stock Transfer Logistics Ledger
          </h2>
          <p className="text-xxs text-muted-foreground uppercase tracking-widest leading-normal">
            Relocate inventory lines across warehouses and retail pharmacy branches.
          </p>
        </div>
        
        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setIsTransferOpen(true)}
          className="h-8 text-xxs uppercase tracking-wider gap-1.5 shadow-md shadow-primary/10"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Request Stock Relocation
        </Button>
      </div>

      {/* Filter bar */}
      <div className="p-4 rounded-xl border border-border/40 bg-card shadow-sm max-w-sm">
        <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Filter Ledger Status
        </label>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All Transfers' },
            { value: 'pending', label: 'Pending Approvals' },
            { value: 'received', label: 'Received (Complete)' },
            { value: 'cancelled', label: 'Rejected (Cancelled)' }
          ]}
          ariaLabel="Filter transfer status"
        />
      </div>

      {/* Main ledger list */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTransfers.map((tx) => {
          const isPending = tx.status === 'pending';
          const isReceived = tx.status === 'received';
          const isCancelled = tx.status === 'cancelled';
          const canApprove = isPending && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'REGIONAL_MANAGER');

          return (
            <Card 
              key={tx.id} 
              className={`border border-border/70 bg-card shadow-sm flex flex-col justify-between transition-all hover:border-border duration-200 relative overflow-hidden ${
                isPending ? 'border-l-4 border-l-warning' : 
                isReceived ? 'border-l-4 border-l-success' : 'border-l-4 border-l-slate-300'
              }`}
            >
              <CardHeader className="pb-2 border-b border-border/10 flex flex-row items-start justify-between gap-3">
                <div>
                  <Badge 
                    variant={
                      tx.status === 'pending' ? 'warning' : 
                      tx.status === 'received' ? 'success' : 
                      tx.status === 'in_transit' ? 'primary' : 'secondary'
                    }
                    className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0"
                    pulse={tx.status === 'pending' || tx.status === 'in_transit'}
                  >
                    {tx.status.replace('_', ' ')}
                  </Badge>
                  <p className="text-xs font-black text-slate-800 mt-2 truncate max-w-[150px]">
                    {tx.productName}
                  </p>
                  <span className="text-[10px] font-mono text-muted-foreground block uppercase mt-0.5">
                    {tx.sku}
                  </span>
                </div>
                
                <div className="text-right">
                  <span className="block text-[8px] text-muted-foreground uppercase font-bold tracking-wider">
                    Quantity
                  </span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">
                    {tx.quantity} pcs
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4 py-3 space-y-4 flex-1 flex flex-col justify-between">
                
                {/* Visual Route */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-border/30 gap-2">
                  <div className="min-w-0 text-center flex-1">
                    <span className="block text-[8px] text-muted-foreground uppercase font-bold tracking-wider">From</span>
                    <span className="text-[10px] text-slate-700 font-bold block truncate" title={tx.sourceBranchName}>
                      {tx.sourceBranchName.replace(' Outlet', '').replace(' Central Distribution', '')}
                    </span>
                  </div>
                  
                  <div className="p-1 rounded-full bg-slate-200/50">
                    <ArrowRightLeft className="h-3 w-3 text-muted-foreground/60" />
                  </div>

                  <div className="min-w-0 text-center flex-1">
                    <span className="block text-[8px] text-muted-foreground uppercase font-bold tracking-wider">To</span>
                    <span className="text-[10px] text-slate-700 font-bold block truncate" title={tx.destinationBranchName}>
                      {tx.destinationBranchName.replace(' Outlet', '').replace(' Central Distribution', '')}
                    </span>
                  </div>
                </div>

                {/* Audit trail info */}
                <div className="space-y-1 text-xxs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Requested By:</span>
                    <span className="font-semibold text-slate-600">{tx.requestedByName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logged At:</span>
                    <span className="font-mono text-slate-500">{new Date(tx.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                  {tx.approvedByName && (
                    <div className="flex justify-between">
                      <span>{isReceived ? 'Approved By:' : 'Processed By:'}</span>
                      <span className="font-semibold text-slate-600">{tx.approvedByName}</span>
                    </div>
                  )}
                </div>

                {/* Ledger actions */}
                <div className="border-t border-border/30 pt-3 flex items-center justify-end h-8">
                  {canApprove && (
                    <div className="flex gap-2 w-full justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isLoading}
                        className="h-7 px-2.5 text-[10px] text-destructive hover:bg-destructive/10 uppercase tracking-wider"
                        onClick={() => rejectTransfer(tx.id)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                      <Button
                        type="button"
                        variant="success"
                        size="sm"
                        disabled={isLoading}
                        className="h-7 px-2.5 text-[10px] text-success-foreground uppercase tracking-wider font-bold"
                        onClick={() => approveTransfer(tx.id)}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    </div>
                  )}
                  
                  {!canApprove && isPending && (
                    <span className="text-[9px] uppercase tracking-wider text-warning font-bold flex items-center gap-1">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      Awaiting Manager Verification
                    </span>
                  )}
                  
                  {isReceived && (
                    <span className="text-[9px] uppercase tracking-wider text-success font-bold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                      Relocation Completed
                    </span>
                  )}

                  {isCancelled && (
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-bold flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      Request Cancelled
                    </span>
                  )}
                </div>

              </CardContent>
            </Card>
          );
        })}

        {filteredTransfers.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center p-8 space-y-2 border border-dashed border-border/80 rounded-2xl bg-card shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
              <Truck className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mt-2">No relocation records</p>
            <p className="text-xxs text-muted-foreground uppercase tracking-widest max-w-xs">
              All stock lines are balanced. No transfer request matches this filter status.
            </p>
          </div>
        )}
      </div>

      {/* Stock Transfer Form Modal */}
      <StockTransferModal 
        isOpen={isTransferOpen} 
        onClose={() => setIsTransferOpen(false)} 
      />

    </div>
  );
};
