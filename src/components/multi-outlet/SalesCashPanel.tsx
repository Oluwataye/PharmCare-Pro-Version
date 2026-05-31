import React, { useState, useMemo } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { useInventoryUseCase } from '../../application/use-cases/useInventoryUseCase';
import { MockInventoryRepository } from '../../data/mock/inventoryRepo';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatNaira } from '../../lib/utils';
import { Discount } from '../../domain/entities/models';
import { 
  ShoppingBag, CheckCircle2, AlertCircle, Search, X,
  Receipt, Calculator, Scale,
  ArrowLeft, TrendingUp, CreditCard, Coins,
  ArrowRight, AlertTriangle, ShieldCheck
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
  discountApplied?: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    discountAmount: number;
  };
}

interface ReconciliationLog {
  id: string;
  date: string;
  branchName: string;
  branchId: string;
  expectedCash: number;
  actualCash: number;
  discrepancy: number;
  status: 'balanced' | 'shortage' | 'overage';
  reconciledBy: string;
}

const inventoryRepo = new MockInventoryRepository();

// Pre-populated transactions representing business activity across the branches
const INITIAL_RECEIPTS: SimulatedReceipt[] = [
  { id: 'rec-1', productName: 'Ciprofloxacin 500mg', sku: 'MED-CIP-500', quantity: 2, totalAmount: 8400, paymentMethod: 'POS', timestamp: '10:15 AM', branchId: 'br-ikeja', branchName: 'Ikeja Outlet' },
  { id: 'rec-2', productName: 'Paracetamol 500mg', sku: 'MED-PCM-500', quantity: 5, totalAmount: 2500, paymentMethod: 'CASH', timestamp: '09:30 AM', branchId: 'br-ikeja', branchName: 'Ikeja Outlet' },
  { id: 'rec-3', productName: 'Amoxicillin 500mg', sku: 'MED-AMX-500', quantity: 3, totalAmount: 10500, paymentMethod: 'TRANSFER', timestamp: '10:45 AM', branchId: 'br-lekki', branchName: 'Lekki Phase 1 Outlet' },
  { id: 'rec-4', productName: 'Atorvastatin 20mg', sku: 'MED-ATO-020', quantity: 1, totalAmount: 6500, paymentMethod: 'POS', timestamp: '08:15 AM', branchId: 'br-lekki', branchName: 'Lekki Phase 1 Outlet' },
  { id: 'rec-5', productName: 'Artemether-Lumefantrine (Coartem)', sku: 'MED-COA-024', quantity: 4, totalAmount: 11200, paymentMethod: 'CASH', timestamp: '11:00 AM', branchId: 'br-ibadan', branchName: 'Ibadan Main Outlet' },
  { id: 'rec-6', productName: 'Metformin 500mg', sku: 'MED-MET-500', quantity: 10, totalAmount: 18000, paymentMethod: 'POS', timestamp: '07:50 AM', branchId: 'br-ibadan', branchName: 'Ibadan Main Outlet' },
  { id: 'rec-7', productName: 'Omeprazole 20mg', sku: 'MED-OME-020', quantity: 2, totalAmount: 2400, paymentMethod: 'TRANSFER', timestamp: '11:15 AM', branchId: 'br-abuja-wuse', branchName: 'Wuse II Premium Outlet' },
  { id: 'rec-8', productName: 'Atorvastatin 20mg', sku: 'MED-ATO-020', quantity: 2, totalAmount: 13000, paymentMethod: 'POS', timestamp: '09:20 AM', branchId: 'br-kano', branchName: 'Kano Commercial Outlet' },
  { id: 'rec-9', productName: 'Amoxicillin 500mg', sku: 'MED-AMX-500', quantity: 5, totalAmount: 17500, paymentMethod: 'CASH', timestamp: '10:05 AM', branchId: 'br-enugu', branchName: 'Enugu Urban Outlet' },
  { id: 'rec-10', productName: 'Ibuprofen 400mg', sku: 'MED-IBU-400', quantity: 8, totalAmount: 6400, paymentMethod: 'POS', timestamp: '08:40 AM', branchId: 'br-port-harcourt', branchName: 'PH GRA Outlet' }
];

// Pre-populated reconciliations logged on previous business days
const INITIAL_RECONCILIATIONS: ReconciliationLog[] = [
  { id: 'recon-1', date: new Date(Date.now() - 86400000).toLocaleDateString(), branchName: 'Ikeja Outlet', branchId: 'br-ikeja', expectedCash: 12500, actualCash: 12500, discrepancy: 0, status: 'balanced', reconciledBy: 'Kemi Balogun' },
  { id: 'recon-2', date: new Date(Date.now() - 86400000).toLocaleDateString(), branchName: 'Lekki Phase 1 Outlet', branchId: 'br-lekki', expectedCash: 9800, actualCash: 9500, discrepancy: -300, status: 'shortage', reconciledBy: 'Dr. Fatima Umar' },
  { id: 'recon-3', date: new Date(Date.now() - 86400000).toLocaleDateString(), branchName: 'Ibadan Main Outlet', branchId: 'br-ibadan', expectedCash: 15400, actualCash: 15500, discrepancy: 100, status: 'overage', reconciledBy: 'Ngozi Okoro' },
  { id: 'recon-4', date: new Date(Date.now() - 172800000).toLocaleDateString(), branchName: 'Wuse II Premium Outlet', branchId: 'br-abuja-wuse', expectedCash: 21000, actualCash: 21000, discrepancy: 0, status: 'balanced', reconciledBy: 'Fatima Ibrahim' }
];

export const SalesCashPanel: React.FC<SalesCashPanelProps> = ({ onInventoryMutated }) => {
  const { selectedRegionId, selectedOutletId, currentUser, branches, discounts } = useSession();
  const { rawInventory, refetch } = useInventoryUseCase();

  // Simulated internal ledgers
  const [receipts, setReceipts] = useState<SimulatedReceipt[]>(INITIAL_RECEIPTS);
  const [reconciliations, setReconciliations] = useState<ReconciliationLog[]>(INITIAL_RECONCILIATIONS);

  // Simulation scope override (allows manager to operate any branch register)
  const [simulatedBranchId, setSimulatedBranchId] = useState<string | null>(null);

  // Form states - Register Sale
  const [selectedSku, setSelectedSku] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saleQty, setSaleQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'POS' | 'TRANSFER'>('CASH');
  const [saleError, setSaleError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState('');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Discount code states
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [discountSuccess, setDiscountSuccess] = useState('');

  // Form states - Reconciliation
  const [actualCashInput, setActualCashInput] = useState('');
  const [reconSuccess, setReconSuccess] = useState('');

  // Determine active branch scope
  const activeBranchId = useMemo(() => {
    if (selectedOutletId !== 'all') {
      return selectedOutletId;
    }
    return simulatedBranchId || '';
  }, [selectedOutletId, simulatedBranchId]);

  const isSimulating = useMemo(() => {
    return selectedOutletId === 'all' && simulatedBranchId !== null;
  }, [selectedOutletId, simulatedBranchId]);

  const activeBranchName = useMemo(() => {
    if (!activeBranchId) return '';
    return branches.find(b => b.id === activeBranchId)?.name || 'Active Outlet';
  }, [activeBranchId, branches]);

  // Scoped list of branches governed by logged-in role
  const visibleBranches = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'SUPER_ADMIN') {
      return branches.filter(b => b.type === 'retail');
    }
    if (currentUser.role === 'REGIONAL_MANAGER') {
      const regionIds = currentUser.assignedRegionIds || [];
      return branches.filter(b => b.type === 'retail' && regionIds.includes(b.regionId));
    }
    // Branch Admin, Pharmacist, Dispenser see only their branch
    return branches.filter(b => b.id === currentUser.branchId);
  }, [currentUser, branches]);

  // Compute products matching simulated or scoped branch
  const branchProducts = useMemo(() => {
    if (!activeBranchId) return [];
    return rawInventory.filter(item => item.branchId === activeBranchId && item.quantity > 0);
  }, [rawInventory, activeBranchId]);

  const activeProduct = useMemo(() => {
    return branchProducts.find(p => p.sku === selectedSku);
  }, [branchProducts, selectedSku]);

  // Calculate receipt totals
  const subtotal = useMemo(() => {
    if (!activeProduct) return 0;
    return activeProduct.price * saleQty;
  }, [activeProduct, saleQty]);

  const discountedSaleAmount = useMemo(() => {
    if (!appliedDiscount) return subtotal;

    if (appliedDiscount.type === 'percentage') {
      const discountVal = (subtotal * appliedDiscount.value) / 100;
      return Math.max(0, subtotal - discountVal);
    } else {
      return Math.max(0, subtotal - appliedDiscount.value);
    }
  }, [subtotal, appliedDiscount]);

  const handleApplyDiscount = () => {
    setDiscountError('');
    setDiscountSuccess('');
    setAppliedDiscount(null);

    if (!discountCode.trim()) {
      return;
    }

    const codeUpper = discountCode.trim().toUpperCase();
    const match = discounts.find(d => d.code.toUpperCase() === codeUpper && d.isActive);

    if (!match) {
      setDiscountError('Invalid or expired code.');
      return;
    }

    if (match.branchId !== 'all' && match.branchId !== activeBranchId) {
      setDiscountError('Discount does not apply to this branch.');
      return;
    }

    setAppliedDiscount(match);
    setDiscountSuccess(`Discount "${match.code}" applied!`);
  };

  // Filtered receipts & reconciliations based on scope
  const scopedReceipts = useMemo(() => {
    if (selectedOutletId !== 'all') {
      return receipts.filter(r => r.branchId === selectedOutletId);
    }
    if (selectedRegionId !== 'all') {
      const branchIds = branches.filter(b => b.regionId === selectedRegionId).map(b => b.id);
      return receipts.filter(r => branchIds.includes(r.branchId));
    }
    return receipts;
  }, [receipts, selectedRegionId, selectedOutletId, branches]);

  const scopedReconciliations = useMemo(() => {
    if (selectedOutletId !== 'all') {
      return reconciliations.filter(r => r.branchId === selectedOutletId);
    }
    if (selectedRegionId !== 'all') {
      const branchIds = branches.filter(b => b.regionId === selectedRegionId).map(b => b.id);
      return reconciliations.filter(r => branchIds.includes(r.branchId));
    }
    return reconciliations;
  }, [reconciliations, selectedRegionId, selectedOutletId, branches]);

  // Compute Expected Cash Sales for the active checkout branch session
  const expectedCashSales = useMemo(() => {
    if (!activeBranchId) return 0;
    return receipts
      .filter(r => r.branchId === activeBranchId && r.paymentMethod === 'CASH')
      .reduce((sum, r) => sum + r.totalAmount, 0);
  }, [receipts, activeBranchId]);

  // Consolidated command stats
  const consolidatedStats = useMemo(() => {
    const list = scopedReceipts;
    const total = list.reduce((sum, r) => sum + r.totalAmount, 0);
    const cash = list.filter(r => r.paymentMethod === 'CASH').reduce((sum, r) => sum + r.totalAmount, 0);
    const pos = list.filter(r => r.paymentMethod === 'POS').reduce((sum, r) => sum + r.totalAmount, 0);
    const transfer = list.filter(r => r.paymentMethod === 'TRANSFER').reduce((sum, r) => sum + r.totalAmount, 0);
    const warnings = scopedReconciliations.filter(r => r.status !== 'balanced').length;

    return { total, cash, pos, transfer, warnings };
  }, [scopedReceipts, scopedReconciliations]);

  // Terminal stats table row calculations
  const terminalAuditRows = useMemo(() => {
    return visibleBranches.map(branch => {
      const branchReceipts = receipts.filter(r => r.branchId === branch.id);
      const totalSales = branchReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
      
      const paymentSplit = branchReceipts.reduce((acc, r) => {
        acc[r.paymentMethod] += r.totalAmount;
        return acc;
      }, { CASH: 0, POS: 0, TRANSFER: 0 });

      const latestRecon = reconciliations.find(r => r.branchId === branch.id);

      return {
        branch,
        totalSales,
        paymentSplit,
        latestRecon
      };
    });
  }, [visibleBranches, receipts, reconciliations]);

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct || !activeBranchId) return;

    if (saleQty > activeProduct.quantity) {
      setSaleError(`Insufficient stock. Maximum available is ${activeProduct.quantity} units.`);
      return;
    }

    setIsSubmittingSale(true);
    setSaleError('');
    setSaleSuccess('');

    try {
      // 1. Decrement Stock level in inventory DB (Mock repository updates shared array)
      await inventoryRepo.updateStock(activeBranchId, activeProduct.sku, -saleQty);

      // 2. Add receipt log
      const newReceipt: SimulatedReceipt = {
        id: `rec-new-${Date.now()}`,
        productName: activeProduct.name,
        sku: activeProduct.sku,
        quantity: saleQty,
        totalAmount: discountedSaleAmount,
        paymentMethod,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        branchId: activeBranchId,
        branchName: activeBranchName,
        discountApplied: appliedDiscount ? {
          code: appliedDiscount.code,
          type: appliedDiscount.type,
          value: appliedDiscount.value,
          discountAmount: subtotal - discountedSaleAmount
        } : undefined
      };

      setReceipts(prev => [newReceipt, ...prev]);
      setSaleSuccess(`Sold ${saleQty} units of ${activeProduct.name} successfully!`);
      
      // Reset form
      setSelectedSku('');
      setProductSearch('');
      setShowSuggestions(false);
      setSaleQty(1);
      setDiscountCode('');
      setAppliedDiscount(null);
      setDiscountError('');
      setDiscountSuccess('');

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
    if (!activeBranchId || !actualCashInput) return;

    const actual = parseFloat(actualCashInput);
    const discrepancy = actual - expectedCashSales;
    
    let status: ReconciliationLog['status'] = 'balanced';
    if (discrepancy < 0) status = 'shortage';
    else if (discrepancy > 0) status = 'overage';

    const newRecon: ReconciliationLog = {
      id: `recon-new-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      branchName: activeBranchName,
      branchId: activeBranchId,
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

  const handleStartSimulation = (branchId: string) => {
    setSimulatedBranchId(branchId);
    setSelectedSku('');
    setProductSearch('');
    setShowSuggestions(false);
    setSaleQty(1);
    setSaleError('');
    setSaleSuccess('');
    setDiscountCode('');
    setAppliedDiscount(null);
    setDiscountError('');
    setDiscountSuccess('');
  };

  // ----------------------------------------------------
  // RENDER CONFIG: Dual-mode presentation layout
  // ----------------------------------------------------

  // View A: Retail Checkout Terminal (either locked to branch, or simulated override active)
  if (activeBranchId) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        
        {/* Header Action Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            {isSimulating && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSimulatedBranchId(null)}
                className="h-8 text-xxs uppercase tracking-wider gap-1.5 bg-card border-border hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Command Console
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
                  POS Checkout Terminal
                </h2>
                {isSimulating ? (
                  <Badge variant="info" className="uppercase font-mono text-[8px] tracking-widest scale-95">Simulation Active</Badge>
                ) : (
                  <Badge variant="success" className="uppercase font-mono text-[8px] tracking-widest scale-95">Operator Mode</Badge>
                )}
              </div>
              <p className="text-xxs text-muted-foreground uppercase tracking-widest leading-normal mt-0.5">
                Register customer purchases and log cash balances for **{activeBranchName}**.
              </p>
            </div>
          </div>
        </div>

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
                  Scope: {activeBranchName} Terminal
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleRegisterSale} className="space-y-4">
                  
                  {/* Search Medicine */}
                  <div className="relative">
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Search Medicine / Product
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => {
                          const q = e.target.value;
                          setProductSearch(q);
                          setShowSuggestions(true);
                          // If cleared, also deselect product
                          if (!q) {
                            setSelectedSku('');
                            setAppliedDiscount(null);
                            setDiscountSuccess('');
                          }
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="Type product name or SKU…"
                        className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-8 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                        autoComplete="off"
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearch('');
                            setSelectedSku('');
                            setShowSuggestions(false);
                            setAppliedDiscount(null);
                            setDiscountSuccess('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && (
                      <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-white shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                        {branchProducts
                          .filter(p =>
                            !productSearch ||
                            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                            p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
                            (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()))
                          )
                          .slice(0, 12)
                          .map(p => (
                            <button
                              key={p.sku}
                              type="button"
                              onMouseDown={() => {
                                setSelectedSku(p.sku);
                                setProductSearch(p.name);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-primary/5 border-b border-border/40 last:border-0 flex items-center justify-between gap-2 group"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 group-hover:text-primary truncate">{p.name}</p>
                                <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                                  {p.sku} · {p.category}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-black text-primary font-mono">{formatNaira(p.price)}</p>
                                <p className={`text-[9px] font-mono font-semibold ${
                                  p.quantity <= (p.reorderLevel ?? 0) ? 'text-amber-500' : 'text-success'
                                }`}>
                                  {p.quantity} left
                                </p>
                              </div>
                            </button>
                          ))
                        }
                        {branchProducts.filter(p =>
                          !productSearch ||
                          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
                          (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()))
                        ).length === 0 && (
                          <div className="px-4 py-6 text-center">
                            <Search className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xxs text-muted-foreground font-medium">No products match <strong>{productSearch}</strong></p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected product chip */}
                    {selectedSku && activeProduct && (
                      <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-primary truncate">{activeProduct.name}</p>
                          <p className="text-[9px] font-mono text-muted-foreground">{activeProduct.sku} · {activeProduct.quantity} in stock</p>
                        </div>
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      </div>
                    )}
                  </div>

                  {/* Quantity and Price Preview */}
                  {activeProduct && (
                    <div className="p-3 rounded-xl border border-border bg-slate-50/55 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-150">
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Checkout Quantity
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={activeProduct.quantity}
                          value={saleQty}
                          onChange={(e) => {
                            setSaleQty(Math.max(1, parseInt(e.target.value) || 1));
                            setAppliedDiscount(null);
                            setDiscountSuccess('');
                          }}
                          className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono font-bold"
                          required
                        />
                      </div>
                      <div className="text-right flex flex-col justify-center">
                        <span className="block text-[8px] text-muted-foreground uppercase font-bold tracking-wider">
                          Receipt Total
                        </span>
                        {appliedDiscount ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] line-through text-muted-foreground font-mono">
                              {formatNaira(subtotal)}
                            </span>
                            <span className="text-sm font-black text-success font-mono mt-0.5 animate-pulse">
                              {formatNaira(discountedSaleAmount)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-black text-primary font-mono mt-0.5">
                            {formatNaira(subtotal)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Discount Code */}
                  {activeProduct && (
                    <div className="space-y-1.5 p-3 rounded-xl border border-border bg-slate-50/55 animate-in slide-in-from-top-2 duration-150">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Discount Coupon
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value)}
                          placeholder="e.g. WELCOME10"
                          className="h-8 flex-1 rounded-lg border border-border bg-card px-3 text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleApplyDiscount}
                          className="h-8 px-3 rounded-lg border border-border bg-card hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-750"
                        >
                          Apply
                        </button>
                      </div>
                      {discountError && (
                        <p className="text-[9px] text-destructive font-medium mt-1">{discountError}</p>
                      )}
                      {discountSuccess && (
                        <p className="text-[9px] text-success font-semibold mt-1">{discountSuccess}</p>
                      )}
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
                          className={`py-2 rounded-lg text-[10px] font-bold tracking-wider uppercase border transition duration-150 ${
                            paymentMethod === method
                              ? 'bg-primary/5 border-primary text-primary'
                              : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-slate-50'
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
                    Receipt Ledger
                  </CardTitle>
                </div>
                <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                  Checkout records for {activeBranchName}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[380px] custom-scrollbar flex-1">
                {receipts.filter(r => r.branchId === activeBranchId).map((rec) => (
                  <div 
                    key={rec.id}
                    className="p-3.5 border-b border-border/50 flex items-center justify-between gap-3 text-xxs bg-slate-50/10 hover:bg-slate-50/30 transition duration-150"
                  >
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">{rec.productName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono mt-1 block">
                        {rec.sku} • {rec.quantity} units
                        {rec.discountApplied && (
                          <span className="text-success font-bold ml-1">
                            ({rec.discountApplied.code})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-800 font-mono block">{formatNaira(rec.totalAmount)}</span>
                      <Badge variant="outline" className="text-[7.5px] uppercase font-mono tracking-wider scale-90 mt-1.5 py-0 px-1 select-none">
                        {rec.paymentMethod}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {receipts.filter(r => r.branchId === activeBranchId).length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-1">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground/20" />
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
                      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono font-bold"
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
                {reconciliations.filter(r => r.branchId === activeBranchId).map((recon) => (
                  <div 
                    key={recon.id}
                    className="p-3.5 border-b border-border/50 text-[10px] space-y-1.5 bg-slate-50/10 hover:bg-slate-50/30 transition duration-150"
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
      </div>
    );
  }

  // View B: Consolidated Operations Command (Management view)
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
          Sales Operations Command Console
        </h2>
        <p className="text-xxs text-muted-foreground uppercase tracking-widest leading-normal">
          Enterprise operational oversight, drawer auditing registers, and simulated terminal monitors.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Sales Card */}
        <Card className="border border-border bg-card p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="block text-[9px] text-muted-foreground uppercase font-extrabold tracking-wider">Consolidated Sales</span>
            <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
              {formatNaira(consolidatedStats.total)}
            </span>
          </div>
        </Card>

        {/* Expected Cash Drawer Sales */}
        <Card className="border border-border bg-card p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-success/5 flex items-center justify-center shrink-0">
            <Coins className="h-5 w-5 text-success" />
          </div>
          <div>
            <span className="block text-[9px] text-muted-foreground uppercase font-extrabold tracking-wider">Expected Cash Sales</span>
            <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
              {formatNaira(consolidatedStats.cash)}
            </span>
          </div>
        </Card>

        {/* POS Terminals Expected */}
        <Card className="border border-border bg-card p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-info/5 flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5 text-info" />
          </div>
          <div>
            <span className="block text-[9px] text-muted-foreground uppercase font-extrabold tracking-wider">POS Terminal Sales</span>
            <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
              {formatNaira(consolidatedStats.pos)}
            </span>
          </div>
        </Card>

        {/* Discrepancy Warnings */}
        <Card className="border border-border bg-card p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-warning/5 flex items-center justify-center shrink-0">
            <AlertTriangle className={`h-5 w-5 ${consolidatedStats.warnings > 0 ? 'text-warning animate-bounce' : 'text-slate-400'}`} />
          </div>
          <div>
            <span className="block text-[9px] text-muted-foreground uppercase font-extrabold tracking-wider">Discrepancy Flags</span>
            <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
              {consolidatedStats.warnings} Warnings
            </span>
          </div>
        </Card>

      </div>

      {/* Main auditing table & grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Terminal status overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Retail Terminal Status & Audits
                </CardTitle>
                <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
                  Expected receipts vs reconciliation results across scope
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xxs border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30 uppercase tracking-wider text-muted-foreground font-bold font-mono">
                    <th className="p-3">Branch Location</th>
                    <th className="p-3 text-right">Total Sales</th>
                    <th className="p-3 text-right">Cash / POS</th>
                    <th className="p-3">Reconciliation Status</th>
                    <th className="p-3 text-right">Simulation</th>
                  </tr>
                </thead>
                <tbody>
                  {terminalAuditRows.map(({ branch, totalSales, paymentSplit, latestRecon }) => {
                    let reconBadge = <Badge variant="outline" className="text-slate-400 uppercase font-mono text-[7px] py-0 px-1 select-none">No Recon Today</Badge>;
                    
                    if (latestRecon) {
                      if (latestRecon.status === 'balanced') {
                        reconBadge = <Badge variant="success" className="uppercase font-mono text-[7px] py-0 px-1 select-none flex gap-0.5 items-center w-fit"><ShieldCheck className="h-2.5 w-2.5 shrink-0" /> Balanced</Badge>;
                      } else if (latestRecon.status === 'shortage') {
                        reconBadge = <Badge variant="destructive" className="uppercase font-mono text-[7px] py-0 px-1 select-none flex gap-0.5 items-center w-fit"><AlertCircle className="h-2.5 w-2.5 shrink-0" /> Shortage (₦{Math.abs(latestRecon.discrepancy)})</Badge>;
                      } else {
                        reconBadge = <Badge variant="warning" className="uppercase font-mono text-[7px] py-0 px-1 select-none flex gap-0.5 items-center w-fit"><AlertTriangle className="h-2.5 w-2.5 shrink-0" /> Overage (+₦{latestRecon.discrepancy})</Badge>;
                      }
                    }

                    return (
                      <tr key={branch.id} className="border-b border-border/30 hover:bg-slate-50/50 transition">
                        <td className="p-3 font-semibold text-slate-800">
                          <span className="text-xs font-bold block">{branch.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{branch.code} • {branch.location}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {formatNaira(totalSales)}
                        </td>
                        <td className="p-3 text-right text-muted-foreground font-mono">
                          <div>CASH: {formatNaira(paymentSplit.CASH)}</div>
                          <div className="mt-0.5">POS: {formatNaira(paymentSplit.POS)}</div>
                        </td>
                        <td className="p-3">
                          {reconBadge}
                          {latestRecon && (
                            <div className="text-[9px] text-muted-foreground font-mono mt-1 uppercase">By: {latestRecon.reconciledBy.split(' ')[0]}</div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleStartSimulation(branch.id)}
                            className="h-7 text-xxs text-primary hover:bg-primary/5 gap-1 inline-flex items-center uppercase tracking-wider font-semibold"
                          >
                            Operate Register
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Consolidated transaction receipts */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Recent Receipts Audit feed */}
          <Card className="border border-border bg-card shadow-sm flex flex-col">
            <CardHeader className="border-b border-border/20 py-3.5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4.5 w-4.5 text-primary" />
                <CardTitle className="text-xxs font-black uppercase tracking-wider text-foreground">
                  Scoped Receipts Feed
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 uppercase font-mono text-[7px] py-0 px-1 select-none font-semibold">
                {scopedReceipts.length} Logs
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[300px] custom-scrollbar">
              {scopedReceipts.map((rec) => (
                <div 
                  key={rec.id}
                  className="p-3.5 border-b border-border/40 text-[10px] space-y-1.5 hover:bg-slate-50/30 transition duration-150 bg-slate-50/10"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-bold text-slate-800 text-[11px] block leading-tight">{rec.productName}</span>
                      <span className="text-[9px] text-muted-foreground font-mono leading-none mt-1 block">
                        {rec.sku} • {rec.quantity} units
                        {rec.discountApplied && (
                          <span className="text-success font-bold ml-1">
                            ({rec.discountApplied.code})
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="font-black text-slate-800 font-mono text-xs">{formatNaira(rec.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-muted-foreground uppercase font-bold tracking-wider pt-0.5">
                    <span className="text-primary/80 font-mono">{rec.branchName}</span>
                    <Badge variant="outline" className="text-[7px] py-0 px-1 font-mono">{rec.paymentMethod}</Badge>
                  </div>
                </div>
              ))}
              {scopedReceipts.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">No recent receipts recorded.</div>
              )}
            </CardContent>
          </Card>

          {/* Consolidated Daily Reconciliations feed */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/20 py-3.5">
              <div className="flex items-center gap-2">
                <Scale className="h-4.5 w-4.5 text-primary" />
                <CardTitle className="text-xxs font-black uppercase tracking-wider text-foreground">
                  Drawer Reconcile Logs
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[220px] custom-scrollbar">
              {scopedReconciliations.map((recon) => (
                <div 
                  key={recon.id}
                  className="p-3.5 border-b border-border/50 text-[10px] space-y-1 bg-slate-50/10 hover:bg-slate-50/30 transition duration-150"
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
                  <div className="flex justify-between text-muted-foreground font-mono text-[9px] mt-1 leading-normal">
                    <span>Expected: {formatNaira(recon.expectedCash)}</span>
                    <span>Actual: {formatNaira(recon.actualCash)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] uppercase tracking-wider mt-1">
                    <span className="font-bold text-slate-600">{recon.branchName}</span>
                    {recon.discrepancy !== 0 && (
                      <span className={`font-bold ${recon.discrepancy < 0 ? 'text-destructive' : 'text-warning'}`}>
                        {recon.discrepancy < 0 ? '-' : '+'}{formatNaira(Math.abs(recon.discrepancy))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {scopedReconciliations.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">No drawer reconciliations recorded.</div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
};
