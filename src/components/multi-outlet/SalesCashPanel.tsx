import React, { useState, useMemo } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { useInventoryUseCase } from '../../application/use-cases/useInventoryUseCase';
import { MockInventoryRepository } from '../../data/mock/inventoryRepo';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { formatNaira } from '../../lib/utils';
import { 
  ShoppingBag, CheckCircle2, AlertCircle, 
  ShieldAlert, Receipt, Calculator, Scale 
} from 'lucide-react';

interface SalesCashPanelProps {
  onInventoryMutated?: () => void;
}

interface SimulatedReceipt {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  totalAmount: number;
  paymentMethod: 'CASH' | 'POS' | 'TRANSFER';
  timestamp: string;
  branchId: string;
  branchName: string;
}

interface ReconciliationLog {
  id: string;
  date: string;
  branchName: string;
  expectedCash: number;
  actualCash: number;
  discrepancy: number;
  status: 'balanced' | 'shortage' | 'overage';
  reconciledBy: string;
}

const inventoryRepo = new MockInventoryRepository();

export const SalesCashPanel: React.FC<SalesCashPanelProps> = ({ onInventoryMutated }) => {
  const { selectedOutletId, currentUser } = useSession();
  const { inventory, refetch } = useInventoryUseCase();

  // Simulated internal local ledgers
  const [receipts, setReceipts] = useState<SimulatedReceipt[]>([
    { id: 'rec-1', productName: 'Ciprofloxacin 500mg', sku: 'MED-CIP-500', quantity: 2, totalAmount: 8400, paymentMethod: 'POS', timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(), branchId: 'br-ikeja', branchName: 'Ikeja Outlet' },
    { id: 'rec-2', productName: 'Paracetamol 500mg', sku: 'MED-PCM-500', quantity: 5, totalAmount: 2500, paymentMethod: 'CASH', timestamp: new Date(Date.now() - 7200000).toLocaleTimeString(), branchId: 'br-ikeja', branchName: 'Ikeja Outlet' }
  ]);

  const [reconciliations, setReconciliations] = useState<ReconciliationLog[]>([
    { id: 'recon-1', date: new Date(Date.now() - 86400000).toLocaleDateString(), branchName: 'Ikeja Outlet', expectedCash: 12500, actualCash: 12500, discrepancy: 0, status: 'balanced', reconciledBy: 'Kemi Balogun' }
  ]);

  // Form states - Register Sale
  const [selectedSku, setSelectedSku] = useState('');
  const [saleQty, setSaleQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'POS' | 'TRANSFER'>('CASH');
  const [saleError, setSaleError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState('');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Form states - Reconciliation
  const [actualCashInput, setActualCashInput] = useState('');
  const [reconSuccess, setReconSuccess] = useState('');

  // Lock sales input if looking at consolidated view or centralized warehouse
  const isBranchScopeLocked = selectedOutletId === 'all';
  const branchName = useMemo(() => {
    if (isBranchScopeLocked) return '';
    return inventory[0]?.branchId ? inventory[0].branchId.replace('br-', '').toUpperCase() + ' Branch' : 'Active Outlet';
  }, [inventory, isBranchScopeLocked]);

  // Products available in current branch with stock > 0
  const availableProducts = useMemo(() => {
    return inventory.filter(item => item.quantity > 0);
  }, [inventory]);

  const activeProduct = useMemo(() => {
    return availableProducts.find(p => p.sku === selectedSku);
  }, [availableProducts, selectedSku]);

  // Calculate totals
  const totalSaleAmount = useMemo(() => {
    if (!activeProduct) return 0;
    return activeProduct.price * saleQty;
  }, [activeProduct, saleQty]);

  // Calculate expected cash sales for current branch session
  const expectedCashSales = useMemo(() => {
    return receipts
      .filter(r => r.branchId === selectedOutletId && r.paymentMethod === 'CASH')
      .reduce((sum, r) => sum + r.totalAmount, 0);
  }, [receipts, selectedOutletId]);

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct || isBranchScopeLocked) return;

    if (saleQty > activeProduct.quantity) {
      setSaleError(`Insufficient stock. Maximum available is ${activeProduct.quantity} units.`);
      return;
    }

    setIsSubmittingSale(true);
    setSaleError('');
    setSaleSuccess('');

    try {
      // 1. Decrement Stock level in inventory DB (Mock repository updates shared array)
      await inventoryRepo.updateStock(selectedOutletId, activeProduct.sku, -saleQty);

      // 2. Add receipt log
      const newReceipt: SimulatedReceipt = {
        id: `rec-new-${Date.now()}`,
        productName: activeProduct.name,
        sku: activeProduct.sku,
        quantity: saleQty,
        totalAmount: totalSaleAmount,
        paymentMethod,
        timestamp: new Date().toLocaleTimeString(),
        branchId: selectedOutletId,
        branchName: activeProduct.batchNumber || 'Local Branch'
      };

      setReceipts(prev => [newReceipt, ...prev]);
      setSaleSuccess(`Sold ${saleQty} units of ${activeProduct.name} successfully!`);
      
      // Reset form
      setSelectedSku('');
      setSaleQty(1);

      // 3. Trigger inventory re-fetch
      await refetch();
      if (onInventoryMutated) onInventoryMutated();
    } catch (err: any) {
      setSaleError(`Failed to process sale: ${err.message}`);
    } finally {
      setIsSubmittingSale(false);
      setTimeout(() => setSaleSuccess(''), 3000);
    }
  };

  const handleReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBranchScopeLocked || !actualCashInput) return;

    const actual = parseFloat(actualCashInput);
    const discrepancy = actual - expectedCashSales;
    
    let status: ReconciliationLog['status'] = 'balanced';
    if (discrepancy < 0) status = 'shortage';
    else if (discrepancy > 0) status = 'overage';

    const newRecon: ReconciliationLog = {
      id: `recon-new-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      branchName: branchName || 'Active Branch',
      expectedCash: expectedCashSales,
      actualCash: actual,
      discrepancy,
      status,
      reconciledBy: currentUser?.name || 'Staff'
    };

    setReconciliations(prev => [newRecon, ...prev]);
    setReconSuccess('Daily drawer reconciliation logged successfully!');
    setActualCashInput('');

    setTimeout(() => setReconSuccess(''), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
          Sales Registration & Drawer Reconciliation
        </h2>
        <p className="text-xxs text-muted-foreground uppercase tracking-widest leading-normal">
          Process point-of-sale customer checkouts and reconcile cash drawer balances.
        </p>
      </div>

      {isBranchScopeLocked ? (
        <div className="flex items-center gap-3 p-5 rounded-2xl border border-destructive/20 bg-destructive/5 text-xxs text-destructive leading-normal font-medium max-w-2xl">
          <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <span className="font-bold uppercase tracking-wider">Checkout Terminal Locked:</span> You are currently viewing Consolidated Enterprise scope. Sales registration and cash reconciliation logs require a specific **Retail Outlet** selection. Select a branch from the location scope selector to unlock.
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Column 1: Register Sale Form */}
          <div className="lg:col-span-1">
            <Card className="border border-border bg-card shadow-sm h-full">
              <CardHeader className="border-b border-border/20 pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4.5 w-4.5 text-primary" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Register Customer Sale
                  </CardTitle>
                </div>
                <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                  Terminal: {branchName}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleRegisterSale} className="space-y-4">
                  
                  {/* Select Product */}
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Select Medicine
                    </label>
                    <Select
                      value={selectedSku}
                      onChange={setSelectedSku}
                      options={[
                        { value: '', label: '-- Choose Product --' },
                        ...availableProducts.map(p => ({
                          value: p.sku,
                          label: `${p.name} (${p.quantity} left) - ${formatNaira(p.price)}`
                        }))
                      ]}
                      ariaLabel="Select medicine to sell"
                    />
                  </div>

                  {/* Quantity and Price Preview */}
                  {activeProduct && (
                    <div className="p-3 rounded-xl border border-border bg-slate-50/50 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Checkout Quantity
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={activeProduct.quantity}
                          value={saleQty}
                          onChange={(e) => setSaleQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono font-bold"
                          required
                        />
                      </div>
                      <div className="text-right flex flex-col justify-center">
                        <span className="block text-[8px] text-muted-foreground uppercase font-bold tracking-wider">
                          Receipt Total
                        </span>
                        <span className="text-sm font-black text-primary font-mono">
                          {formatNaira(totalSaleAmount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Payment Gateway
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['CASH', 'POS', 'TRANSFER'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-2 rounded-lg text-xxs font-bold tracking-wider uppercase border transition duration-200 ${
                            paymentMethod === method
                              ? 'bg-primary/5 border-primary text-primary'
                              : 'border-border bg-card text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Alerts */}
                  {saleError && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xxs text-destructive font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{saleError}</span>
                    </div>
                  )}

                  {saleSuccess && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-success/15 border border-success/20 text-xxs text-success font-semibold">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{saleSuccess}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingSale || !selectedSku}
                    className="w-full h-10 text-xs font-bold uppercase tracking-wider"
                  >
                    {isSubmittingSale ? 'Processing Transaction...' : 'Register Sale & Deduct Stock'}
                  </Button>

                </form>
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Recent Receipts Ledger */}
          <div className="lg:col-span-1">
            <Card className="border border-border bg-card shadow-sm h-full flex flex-col">
              <CardHeader className="border-b border-border/20 pb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4.5 w-4.5 text-primary" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Simulated Receipt Ledger
                  </CardTitle>
                </div>
                <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                  Receipt logs for selected branch
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[360px] custom-scrollbar flex-1">
                {receipts.filter(r => r.branchId === selectedOutletId).map((rec) => (
                  <div 
                    key={rec.id}
                    className="p-3 border-b border-border/50 flex items-center justify-between gap-3 text-xxs bg-slate-50/20 hover:bg-slate-50/50 transition duration-150"
                  >
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">{rec.productName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {rec.sku} • {rec.quantity} pcs
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-800 font-mono block">{formatNaira(rec.totalAmount)}</span>
                      <Badge variant="outline" className="text-[7.5px] uppercase font-mono tracking-wider scale-90 mt-1 py-0 px-1 select-none">
                        {rec.paymentMethod}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {receipts.filter(r => r.branchId === selectedOutletId).length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-1">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs font-bold text-muted-foreground uppercase mt-2">No transaction receipts</p>
                    <p className="text-[10px] text-muted-foreground">Register sales above to populate receipts.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Reconciliation Logs */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Reconciliation Logger form */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/20 pb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4.5 w-4.5 text-primary" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Drawer Reconciliation
                  </CardTitle>
                </div>
                <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                  Verify expected vs actual cash drawer
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="p-3.5 rounded-xl border border-border bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider block">Expected Cash</span>
                    <span className="text-base font-black text-slate-800 font-mono mt-0.5">
                      {formatNaira(expectedCashSales)}
                    </span>
                  </div>
                  <Badge variant="info" className="uppercase font-mono text-[8px] py-0.5 px-1.5 select-none">
                    Session sales
                  </Badge>
                </div>

                <form onSubmit={handleReconcile} className="space-y-3">
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Actual Cash In Drawer (₦)
                    </label>
                    <input
                      type="number"
                      value={actualCashInput}
                      onChange={(e) => setActualCashInput(e.target.value)}
                      placeholder="e.g. 12500"
                      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono font-bold"
                      required
                    />
                  </div>

                  {reconSuccess && (
                    <div className="flex items-center gap-1.5 p-2 rounded bg-success/15 border border-success/20 text-xxs text-success font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{reconSuccess}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full h-9 text-xxs uppercase tracking-wider font-bold border-primary/20 text-primary hover:bg-primary/5 bg-card"
                  >
                    Submit Reconciliation Log
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Reconciliation History List */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/20 py-3.5">
                <div className="flex items-center gap-2">
                  <Scale className="h-4.5 w-4.5 text-primary" />
                  <CardTitle className="text-xxs font-black uppercase tracking-wider text-foreground">
                    Reconciliation History
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[160px] custom-scrollbar">
                {reconciliations.map((recon) => (
                  <div 
                    key={recon.id}
                    className="p-3 border-b border-border/50 text-[10px] space-y-1.5 bg-slate-50/10 hover:bg-slate-50/30 transition duration-150"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 font-mono">{recon.date}</span>
                      <Badge 
                        variant={
                          recon.status === 'balanced' ? 'success' : 
                          recon.status === 'shortage' ? 'destructive' : 'warning'
                        }
                        className="text-[7px] tracking-wider py-0 px-1 select-none font-mono uppercase"
                      >
                        {recon.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Expected: {formatNaira(recon.expectedCash)}</span>
                      <span>Actual: {formatNaira(recon.actualCash)}</span>
                    </div>
                    {recon.discrepancy !== 0 && (
                      <div className={`text-[9px] font-bold ${recon.discrepancy < 0 ? 'text-destructive' : 'text-warning'}`}>
                        Discrepancy: {recon.discrepancy < 0 ? '-' : '+'}{formatNaira(Math.abs(recon.discrepancy))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>

        </div>
      )}

    </div>
  );
};
