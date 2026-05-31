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
  ArrowRight, AlertTriangle, ShieldCheck,
  Plus, Minus, Trash2
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { getCartSession, setCartSession, clearCartSession } from '../../lib/indexedDb';

interface SalesCashPanelProps {
  onInventoryMutated?: () => void;
}

interface ReceiptItem {
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

interface SimulatedReceipt {
  id: string;
  items: ReceiptItem[];
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
  originalAmount?: number;
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
  { id: 'rec-1', items: [{ productName: 'Ciprofloxacin 500mg', sku: 'MED-CIP-500', quantity: 2, unitPrice: 4200 }], totalAmount: 8400, paymentMethod: 'POS', timestamp: '2026-05-31T10:15:00.000Z', branchId: 'br-ikeja', branchName: 'Ikeja Outlet' },
  { id: 'rec-2', items: [{ productName: 'Paracetamol 500mg', sku: 'MED-PCM-500', quantity: 5, unitPrice: 500 }], totalAmount: 2500, paymentMethod: 'CASH', timestamp: '2026-05-31T09:30:00.000Z', branchId: 'br-ikeja', branchName: 'Ikeja Outlet' },
  { id: 'rec-3', items: [{ productName: 'Amoxicillin 500mg', sku: 'MED-AMX-500', quantity: 3, unitPrice: 3500 }], totalAmount: 10500, paymentMethod: 'TRANSFER', timestamp: '2026-05-31T10:45:00.000Z', branchId: 'br-lekki', branchName: 'Lekki Phase 1 Outlet' },
  { id: 'rec-4', items: [{ productName: 'Atorvastatin 20mg', sku: 'MED-ATO-020', quantity: 1, unitPrice: 6500 }], totalAmount: 6500, paymentMethod: 'POS', timestamp: '2026-05-31T08:15:00.000Z', branchId: 'br-lekki', branchName: 'Lekki Phase 1 Outlet' },
  { id: 'rec-5', items: [{ productName: 'Artemether-Lumefantrine (Coartem)', sku: 'MED-COA-024', quantity: 4, unitPrice: 2800 }], totalAmount: 11200, paymentMethod: 'CASH', timestamp: '2026-05-31T11:00:00.000Z', branchId: 'br-ibadan', branchName: 'Ibadan Main Outlet' },
  { id: 'rec-6', items: [{ productName: 'Metformin 500mg', sku: 'MED-MET-500', quantity: 10, unitPrice: 1800 }], totalAmount: 18000, paymentMethod: 'POS', timestamp: '2026-05-31T07:50:00.000Z', branchId: 'br-ibadan', branchName: 'Ibadan Main Outlet' },
  { id: 'rec-7', items: [{ productName: 'Omeprazole 20mg', sku: 'MED-OME-020', quantity: 2, unitPrice: 1200 }], totalAmount: 2400, paymentMethod: 'TRANSFER', timestamp: '2026-05-31T11:15:00.000Z', branchId: 'br-abuja-wuse', branchName: 'Wuse II Premium Outlet' },
  { id: 'rec-8', items: [{ productName: 'Atorvastatin 20mg', sku: 'MED-ATO-020', quantity: 2, unitPrice: 6500 }], totalAmount: 13000, paymentMethod: 'POS', timestamp: '2026-05-31T09:20:00.000Z', branchId: 'br-kano', branchName: 'Kano Commercial Outlet' },
  { id: 'rec-9', items: [{ productName: 'Amoxicillin 500mg', sku: 'MED-AMX-500', quantity: 5, unitPrice: 3500 }], totalAmount: 17500, paymentMethod: 'CASH', timestamp: '2026-05-31T10:05:00.000Z', branchId: 'br-enugu', branchName: 'Enugu Urban Outlet' },
  { id: 'rec-10', items: [{ productName: 'Ibuprofen 400mg', sku: 'MED-IBU-400', quantity: 8, unitPrice: 800 }], totalAmount: 6400, paymentMethod: 'POS', timestamp: '2026-05-31T08:40:00.000Z', branchId: 'br-port-harcourt', branchName: 'PH GRA Outlet' }
];

// Pre-populated reconciliations logged on previous business days
const INITIAL_RECONCILIATIONS: ReconciliationLog[] = [
  { id: 'recon-1', date: new Date(Date.now() - 86400000).toLocaleDateString(), branchName: 'Ikeja Outlet', branchId: 'br-ikeja', expectedCash: 12500, actualCash: 12500, discrepancy: 0, status: 'balanced', reconciledBy: 'Kemi Balogun' },
  { id: 'recon-2', date: new Date(Date.now() - 86400000).toLocaleDateString(), branchName: 'Lekki Phase 1 Outlet', branchId: 'br-lekki', expectedCash: 9800, actualCash: 9500, discrepancy: -300, status: 'shortage', reconciledBy: 'Dr. Fatima Umar' },
  { id: 'recon-3', date: new Date(Date.now() - 86400000).toLocaleDateString(), branchName: 'Ibadan Main Outlet', branchId: 'br-ibadan', expectedCash: 15400, actualCash: 15500, discrepancy: 100, status: 'overage', reconciledBy: 'Ngozi Okoro' },
  { id: 'recon-4', date: new Date(Date.now() - 172800000).toLocaleDateString(), branchName: 'Wuse II Premium Outlet', branchId: 'br-abuja-wuse', expectedCash: 21000, actualCash: 21000, discrepancy: 0, status: 'balanced', reconciledBy: 'Fatima Ibrahim' }
];

export interface CartItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  stock: number;
}

export const SalesCashPanel: React.FC<SalesCashPanelProps> = ({ onInventoryMutated }) => {
  const { selectedRegionId, selectedOutletId, currentUser, branches, discounts } = useSession();
  const { rawInventory, refetch } = useInventoryUseCase();

  // Simulated internal ledgers
  const [receipts, setReceipts] = useState<SimulatedReceipt[]>(INITIAL_RECEIPTS);
  const [reconciliations, setReconciliations] = useState<ReconciliationLog[]>(INITIAL_RECONCILIATIONS);

  // Simulation scope override (allows manager to operate any branch register)
  const [simulatedBranchId, setSimulatedBranchId] = useState<string | null>(null);

  // Shopping cart items state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Selected receipt for showing in ReceiptModal
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<SimulatedReceipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Form states - Register Sale
  const [productSearch, setProductSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  // Session recovery banner
  const [restoredBanner, setRestoredBanner] = useState('');

  // Storage key for cart persistence
  const storageKey = useMemo(() => {
    if (!currentUser || !activeBranchId) return '';
    return `pharmcare_cart_${currentUser.id}_${activeBranchId}`;
  }, [currentUser, activeBranchId]);

  // Keep track of the last loaded storage key to avoid writing empty arrays during load phase
  const lastLoadedKeyRef = React.useRef<string>('');

  // Load saved cart when operator or active branch changes
  React.useEffect(() => {
    let timer: any = null;
    let isMounted = true;

    if (!storageKey) {
      setCartItems([]);
      lastLoadedKeyRef.current = '';
      return;
    }

    const loadCart = async () => {
      try {
        const saved = await getCartSession<CartItem[]>(storageKey);
        if (!isMounted) return;

        if (saved && saved.length > 0) {
          setCartItems(saved);
          setRestoredBanner('Active cart session recovered.');
          timer = setTimeout(() => {
            if (isMounted) setRestoredBanner('');
          }, 4000);
        } else {
          setCartItems([]);
        }
        lastLoadedKeyRef.current = storageKey;
      } catch (e) {
        console.error('Failed to load cart from IndexedDB:', e);
        if (isMounted) setCartItems([]);
      }
    };

    loadCart();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [storageKey]);

  // Save cart changes to IndexedDB
  React.useEffect(() => {
    if (!storageKey || storageKey !== lastLoadedKeyRef.current) return;

    const saveCart = async () => {
      try {
        if (cartItems.length > 0) {
          await setCartSession(storageKey, cartItems);
        } else {
          await clearCartSession(storageKey);
        }
      } catch (e) {
        console.error('Failed to save cart to IndexedDB:', e);
      }
    };

    saveCart();
  }, [cartItems, storageKey]);

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

  // Cart operations helper functions
  const addToCart = (product: typeof branchProducts[0]) => {
    // Limit to 15 unique items
    if (cartItems.length >= 15 && !cartItems.some(i => i.sku === product.sku)) {
      setSaleError('Cart limit reached (max 15 unique items).');
      return;
    }

    const existing = cartItems.find(i => i.sku === product.sku);
    const newQty = existing ? existing.quantity + 1 : 1;

    if (newQty > product.quantity) {
      setSaleError(`Insufficient stock for ${product.name}. Max available is ${product.quantity}.`);
      return;
    }

    if (existing) {
      setCartItems(prev => prev.map(item => 
        item.sku === product.sku 
          ? { ...item, quantity: newQty, total: newQty * item.price } 
          : item
      ));
    } else {
      const newItem: CartItem = {
        sku: product.sku,
        name: product.name,
        quantity: 1,
        price: product.price,
        total: product.price,
        stock: product.quantity
      };
      setCartItems(prev => [...prev, newItem]);
    }
    setSaleError('');
    setProductSearch('');
    setShowSuggestions(false);
  };

  const updateCartQty = (sku: string, qty: number) => {
    const item = cartItems.find(i => i.sku === sku);
    if (!item) return;

    if (qty > item.stock) {
      setSaleError(`Cannot exceed available stock (${item.stock} units) for ${item.name}.`);
      return;
    }

    if (qty < 1) {
      removeFromCart(sku);
      return;
    }

    setCartItems(prev => prev.map(i => 
      i.sku === sku 
        ? { ...i, quantity: qty, total: qty * i.price } 
        : i
    ));
    setSaleError('');
  };

  const removeFromCart = (sku: string) => {
    setCartItems(prev => prev.filter(i => i.sku !== sku));
    setSaleError('');
  };

  // Calculate receipt totals based on cart
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

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
    if (!activeBranchId) return;

    if (cartItems.length === 0) {
      setSaleError('Cannot register sale. The cart is empty.');
      return;
    }

    setIsSubmittingSale(true);
    setSaleError('');
    setSaleSuccess('');

    try {
      // 1. Decrement Stock level in inventory DB for ALL items in the cart
      for (const item of cartItems) {
        await inventoryRepo.updateStock(activeBranchId, item.sku, -item.quantity);
      }

      // 2. Add receipt log
      const newReceipt: SimulatedReceipt = {
        id: `rec-new-${Date.now()}`,
        items: cartItems.map(item => ({
          productName: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.price
        })),
        totalAmount: discountedSaleAmount,
        paymentMethod,
        timestamp: new Date().toISOString(), // Use full ISO timestamp for ReceiptModal formatting
        branchId: activeBranchId,
        branchName: activeBranchName,
        discountApplied: appliedDiscount ? {
          code: appliedDiscount.code,
          type: appliedDiscount.type,
          value: appliedDiscount.value,
          discountAmount: subtotal - discountedSaleAmount
        } : undefined,
        originalAmount: subtotal
      };

      setReceipts(prev => [newReceipt, ...prev]);
      setSaleSuccess(`Cart checkout of ${cartItems.length} items completed successfully!`);
      
      // Auto-open print receipt modal
      setSelectedReceiptForModal(newReceipt);
      setIsReceiptModalOpen(true);

      // Reset form
      setCartItems([]);
      setProductSearch('');
      setShowSuggestions(false);
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
    setCartItems([]);
    setProductSearch('');
    setShowSuggestions(false);
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

        {/* Session Restored Alert Banner */}
        {restoredBanner && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xxs text-blue-800 font-semibold uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-blue-600 shrink-0" />
              <span>{restoredBanner}</span>
            </div>
            <button 
              onClick={() => setRestoredBanner('')} 
              className="text-blue-500 hover:text-blue-700 transition"
              type="button"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 3-Column POS Cart layout */}
        <div className="grid gap-6 lg:grid-cols-4">
          
          {/* Columns 1 & 2: Search & Shopping Cart */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Search Box */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Search & Add Products
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Search by name or SKU. Select to add item directly to checkout.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-1 relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Type product name or SKU to add to cart..."
                    className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-8 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    autoComplete="off"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch('');
                        setShowSuggestions(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Suggestions */}
                {showSuggestions && (
                  <div className="absolute left-5 right-5 z-50 mt-1 rounded-xl border border-border bg-white shadow-xl overflow-hidden max-h-56 overflow-y-auto">
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
                          onMouseDown={() => addToCart(p)}
                          className="w-full text-left px-3 py-2 hover:bg-primary/5 border-b border-border/40 last:border-0 flex items-center justify-between gap-2 group"
                        >
                          <div className="min-w-0 py-1">
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
              </CardContent>
            </Card>

            {/* Shopping Cart Items Table */}
            <Card className="border border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Current Sale Items ({cartItems.length}/15 unique)
                </CardTitle>
                {cartItems.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCartItems([]);
                      setSaleError('');
                    }}
                    className="h-7 text-[9px] uppercase tracking-wider text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive transition-all duration-150"
                  >
                    Clear Cart
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[350px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xxs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-border font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="p-3 pl-4">Product Name</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 pr-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item) => (
                        <tr key={item.sku} className="border-b border-border/60 hover:bg-slate-50/20 transition duration-150">
                          <td className="p-3 pl-4 min-w-[160px]">
                            <p className="font-bold text-slate-800 text-xs">{item.name}</p>
                            <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{item.sku}</p>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-700">
                            {formatNaira(item.price)}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-50 border border-border rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.sku, item.quantity - 1)}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-white text-muted-foreground hover:text-foreground transition duration-150 border border-transparent hover:border-border"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center font-bold text-xs font-mono">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.sku, item.quantity + 1)}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-white text-muted-foreground hover:text-foreground transition duration-150 border border-transparent hover:border-border"
                                disabled={item.quantity >= item.stock}
                                title={item.quantity >= item.stock ? "Max stock reached" : "Increase quantity"}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-black text-primary">
                            {formatNaira(item.total)}
                          </td>
                          <td className="p-3 pr-4 text-center">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.sku)}
                              className="p-1 rounded hover:bg-destructive/5 text-slate-400 hover:text-destructive transition duration-150"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {cartItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-muted-foreground bg-slate-50/10">
                            <ShoppingBag className="h-10 w-10 text-muted-foreground/15 mx-auto mb-2" />
                            <p className="text-xs font-bold uppercase">Your checkout cart is empty</p>
                            <p className="text-[10px] mt-1">Search and select items above to start building a sale.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Column 3: Summary, Coupons, and Recent Receipts */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Checkout Totals & Payment */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                
                {/* Cost Details */}
                <div className="space-y-2 text-xxs font-mono border-b border-border/60 pb-3">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>{formatNaira(subtotal)}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-success font-semibold">
                      <span>Discount ({appliedDiscount.code}):</span>
                      <span>-{formatNaira(subtotal - discountedSaleAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800 pt-1 border-t border-dashed border-border">
                    <span>Net Total:</span>
                    <span className="text-sm font-black text-primary font-mono">{formatNaira(discountedSaleAmount)}</span>
                  </div>
                </div>

                {/* Discount Coupons */}
                <div className="space-y-1.5 p-3 rounded-xl border border-border bg-slate-50/55">
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                    Apply Coupon Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="e.g. WELCOME10"
                      className="h-8 flex-1 rounded-lg border border-border bg-card px-2.5 text-[10px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      className="h-8 px-3 rounded-lg border border-border bg-card hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-700"
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

                {/* Payment Gateway */}
                <div className="space-y-1.5">
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground">
                    Payment Gateway
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['CASH', 'POS', 'TRANSFER'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 rounded-lg text-[9px] font-bold tracking-wider uppercase border transition duration-150 ${
                          paymentMethod === method
                            ? 'bg-primary/5 border-primary text-primary font-black'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-slate-50'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alerts */}
                {saleError && (
                  <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xxs text-destructive font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="leading-tight">{saleError}</span>
                  </div>
                )}

                {saleSuccess && (
                  <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-success/15 border border-success/20 text-xxs text-success font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="leading-tight">{saleSuccess}</span>
                  </div>
                )}

                {/* Checkout Submit */}
                <form onSubmit={handleRegisterSale}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingSale || cartItems.length === 0}
                    className="w-full h-10 text-xs font-bold uppercase tracking-wider"
                  >
                    {isSubmittingSale ? 'Processing...' : 'Checkout & Print Receipt'}
                  </Button>
                </form>

              </CardContent>
            </Card>

            {/* Collapsible Recent Receipts Ledger */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border/20">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Receipts Ledger
                  </CardTitle>
                </div>
                <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
                  Click on any receipt below to reprint
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[220px] custom-scrollbar">
                {receipts.filter(r => r.branchId === activeBranchId).map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      setSelectedReceiptForModal(rec);
                      setIsReceiptModalOpen(true);
                    }}
                    className="w-full text-left p-3.5 border-b border-border/50 flex items-center justify-between gap-3 text-xxs bg-slate-50/10 hover:bg-primary/5 transition duration-150 border-r-2 border-r-transparent hover:border-r-primary group"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 text-xs block truncate group-hover:text-primary transition duration-150">
                        {rec.items && rec.items.length > 0
                          ? rec.items.map(item => item.productName).join(', ')
                          : 'Standard Sale'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono mt-1 block">
                        {rec.items ? rec.items.length : 1} item(s) · {rec.items ? rec.items.reduce((sum, i) => sum + i.quantity, 0) : 1} units
                        {rec.discountApplied && (
                          <span className="text-success font-bold ml-1">
                            ({rec.discountApplied.code})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-800 font-mono block group-hover:text-primary transition duration-150">{formatNaira(rec.totalAmount)}</span>
                      <Badge variant="outline" className="text-[7.5px] uppercase font-mono tracking-wider scale-90 mt-1 py-0 px-1 select-none">
                        {rec.paymentMethod}
                      </Badge>
                    </div>
                  </button>
                ))}
                {receipts.filter(r => r.branchId === activeBranchId).length === 0 && (
                  <div className="py-8 text-center text-muted-foreground bg-slate-50/10">
                    <ShoppingBag className="h-6 w-6 text-muted-foreground/15 mx-auto mb-2" />
                    <p className="text-[10px] font-bold uppercase">No recent transactions</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Column 4: Daily Drawer Reconciliation */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Reconciliation Logger */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/20 pb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Drawer Reconciliation
                  </CardTitle>
                </div>
                <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
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

            {/* Reconciliation History */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/20 py-3.5">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
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

        {/* Modal display for printing receipt */}
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          receiptData={selectedReceiptForModal ? {
            id: selectedReceiptForModal.id,
            items: selectedReceiptForModal.items,
            totalAmount: selectedReceiptForModal.totalAmount,
            paymentMethod: selectedReceiptForModal.paymentMethod,
            timestamp: selectedReceiptForModal.timestamp,
            branchName: selectedReceiptForModal.branchName,
            cashierName: currentUser?.name || 'Staff',
            discountApplied: selectedReceiptForModal.discountApplied,
            originalAmount: selectedReceiptForModal.originalAmount
          } : null}
        />
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
                  onClick={() => {
                    setSelectedReceiptForModal(rec);
                    setIsReceiptModalOpen(true);
                  }}
                  className="p-3.5 border-b border-border/40 text-[10px] space-y-1.5 hover:bg-primary/5 transition duration-150 bg-slate-50/10 cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 text-[11px] block leading-tight truncate">
                        {rec.items && rec.items.length > 0
                          ? rec.items.map(item => item.productName).join(', ')
                          : 'Standard Sale'}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-mono leading-none mt-1 block">
                        {rec.items ? rec.items.length : 1} item(s) · {rec.items ? rec.items.reduce((sum, i) => sum + i.quantity, 0) : 1} units
                        {rec.discountApplied && (
                          <span className="text-success font-bold ml-1">
                            ({rec.discountApplied.code})
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="font-black text-slate-800 font-mono text-xs shrink-0">{formatNaira(rec.totalAmount)}</span>
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

      {/* Modal display for printing receipt */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptData={selectedReceiptForModal ? {
          id: selectedReceiptForModal.id,
          items: selectedReceiptForModal.items,
          totalAmount: selectedReceiptForModal.totalAmount,
          paymentMethod: selectedReceiptForModal.paymentMethod,
          timestamp: selectedReceiptForModal.timestamp,
          branchName: selectedReceiptForModal.branchName,
          cashierName: currentUser?.name || 'Staff',
          discountApplied: selectedReceiptForModal.discountApplied,
          originalAmount: selectedReceiptForModal.originalAmount
        } : null}
      />

    </div>
  );
};
