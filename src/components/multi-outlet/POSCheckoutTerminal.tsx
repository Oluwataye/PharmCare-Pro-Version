/**
 * POSCheckoutTerminal
 *
 * Production-grade, reusable Point-of-Sale checkout terminal component.
 * Designed with a scalable component architecture for multi-outlet pharmacy systems.
 *
 * Architecture:
 *  - POSCheckoutTerminal (root): Orchestrates state, keyboard shortcuts, and layout
 *    ├── POSProductSearch:         Autocomplete product search input with keyboard navigation
 *    ├── POSCartTable:             Cart line items with inline qty controls & stock validation
 *    ├── POSMetadataPanel:         Customer profile + prescription details (collapsible)
 *    ├── POSOrderSummary:          Totals, discount coupon, payment gateway selector
 *    └── POSDraftsLedger:          IndexedDB-backed suspended drafts ledger
 *
 * Props / API:
 *  @prop {CartItem[]}             cartItems          – Current cart items (controlled)
 *  @prop {(items: CartItem[]) => void} onCartChange  – Callback when cart mutates
 *  @prop {InventoryItem[]}        availableProducts  – Branch-scoped in-stock products
 *  @prop {string}                 branchId           – Active branch identifier
 *  @prop {string}                 branchName         – Display name of active branch
 *  @prop {string}                 operatorName       – Name of logged-in cashier
 *  @prop {Discount[]}             discounts          – Active discount definitions
 *  @prop {TransactionDraft[]}     drafts             – Suspended drafts from IndexedDB
 *  @prop {boolean}                isSubmitting       – Disables form while processing
 *  @prop {boolean}                isSimulating       – Shows simulation badge in header
 *  @prop {string}                 [saleError]        – Error message to display
 *  @prop {string}                 [saleSuccess]      – Success message to display
 *  @prop {string}                 [restoredBanner]   – Cart session recovery notice
 *  @prop {(e: React.FormEvent) => void} onCheckout   – Checkout form submit handler
 *  @prop {() => void}             onSaveDraft        – Save/update draft handler
 *  @prop {(draft) => void}        onLoadDraft        – Load draft into cart handler
 *  @prop {(id: string) => void}   onDeleteDraft      – Delete a draft by ID handler
 *  @prop {() => void}             [onBackToConsole]  – Back button handler (simulation mode)
 *  @prop {() => void}             [onDismissBanner]  – Dismiss the restored session banner
 *  @prop {CheckoutFormState}      formState          – Controlled form fields (customer, Rx, etc.)
 *  @prop {(state: Partial<CheckoutFormState>) => void} onFormStateChange – Form field updater
 *  @prop {string | null}          loadedDraftId      – Currently loaded draft ID (or null)
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ShoppingBag, CheckCircle2, AlertCircle, Search, X,
  Receipt, ArrowLeft, CreditCard, Coins,
  ShieldCheck, Plus, Minus, Trash2, User,
  FileText, ChevronDown, ChevronUp, Stethoscope, Zap,
  Package, Tag, Clock, Loader2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatNaira } from '../../lib/utils';
import { Discount } from '../../domain/entities/models';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface POSCartItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  stock: number;
}

export interface POSInventoryItem {
  sku: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  reorderLevel?: number;
  branchId: string;
}

export interface POSTransactionDraft {
  id: string;
  branchId: string;
  branchName: string;
  operatorId: string;
  operatorName: string;
  cartItems: POSCartItem[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  prescriptionId: string;
  doctorName: string;
  dosageInstructions: string;
  billingNotes: string;
  discountCode: string;
  appliedDiscount: Discount | null;
  paymentMethod: 'CASH' | 'POS' | 'TRANSFER';
  timestamp: string;
}

export interface CheckoutFormState {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  prescriptionId: string;
  doctorName: string;
  dosageInstructions: string;
  billingNotes: string;
  discountCode: string;
  appliedDiscount: Discount | null;
  discountError: string;
  discountSuccess: string;
  paymentMethod: 'CASH' | 'POS' | 'TRANSFER';
}

export interface POSCheckoutTerminalProps {
  // Cart state (controlled)
  cartItems: POSCartItem[];
  onCartChange: (items: POSCartItem[]) => void;

  // Data sources
  availableProducts: POSInventoryItem[];
  branchId: string;
  branchName: string;
  operatorName: string;
  discounts: Discount[];
  drafts: POSTransactionDraft[];

  // Checkout state
  isSubmitting: boolean;
  isSimulating?: boolean;
  saleError?: string;
  saleSuccess?: string;
  restoredBanner?: string;
  loadedDraftId: string | null;

  // Event handlers
  onCheckout: (e: React.FormEvent) => void;
  onSaveDraft: () => void;
  onLoadDraft: (draft: POSTransactionDraft) => void;
  onDeleteDraft: (id: string) => void;
  onApplyDiscount: (code: string) => void;
  onBackToConsole?: () => void;
  onDismissBanner?: () => void;

  // Controlled form state
  formState: CheckoutFormState;
  onFormStateChange: (patch: Partial<CheckoutFormState>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: POSProductSearch
// ─────────────────────────────────────────────────────────────────────────────

interface POSProductSearchProps {
  products: POSInventoryItem[];
  cartItems: POSCartItem[];
  onAddToCart: (product: POSInventoryItem) => void;
  disabled?: boolean;
}

const POSProductSearch: React.FC<POSProductSearchProps> = ({
  products,
  cartItems,
  onAddToCart,
  disabled
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return products.slice(0, 10);
    const q = query.toLowerCase();
    return products
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [query, products]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightIdx]) {
        onAddToCart(filtered[highlightIdx]);
        setQuery('');
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }, [open, filtered, highlightIdx, onAddToCart]);

  // Scroll highlighted item into view
  useEffect(() => {
    const item = listRef.current?.children[highlightIdx] as HTMLElement;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  return (
    <Card className="border border-border bg-card shadow-sm" aria-label="Product Search">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-primary" />
          Search &amp; Add Products
        </CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground">
          Search by name or SKU. Use ↑↓ keys to navigate, Enter to add.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-1 relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-label="Search products"
            aria-autocomplete="list"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlightIdx(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            onKeyDown={handleKey}
            placeholder="Type product name or SKU to add to cart..."
            className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-8 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {open && (
          <div
            ref={listRef}
            role="listbox"
            aria-label="Product suggestions"
            className="absolute left-5 right-5 z-50 mt-1 rounded-xl border border-border bg-white shadow-xl overflow-hidden max-h-60 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center" role="option" aria-selected="false">
                <Search className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xxs text-muted-foreground font-medium">
                  No products match <strong>{query}</strong>
                </p>
              </div>
            ) : (
              filtered.map((p, idx) => {
                const inCart = cartItems.find(c => c.sku === p.sku);
                const isLow = p.quantity <= (p.reorderLevel ?? 5);
                return (
                  <button
                    key={p.sku}
                    type="button"
                    role="option"
                    aria-selected={idx === highlightIdx}
                    onMouseDown={() => {
                      onAddToCart(p);
                      setQuery('');
                      setOpen(false);
                    }}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`w-full text-left px-3 py-2 border-b border-border/40 last:border-0 flex items-center justify-between gap-2 group transition duration-100 ${
                      idx === highlightIdx ? 'bg-primary/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 py-1">
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-primary truncate flex items-center gap-1.5">
                        {p.name}
                        {inCart && (
                          <span className="text-[8px] font-mono bg-primary/10 text-primary px-1 rounded font-bold">
                            IN CART ×{inCart.quantity}
                          </span>
                        )}
                      </p>
                      <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                        {p.sku} · {p.category}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-primary font-mono">{formatNaira(p.price)}</p>
                      <p className={`text-[9px] font-mono font-semibold ${isLow ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {p.quantity} left{isLow ? ' ⚠' : ''}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: POSCartTable
// ─────────────────────────────────────────────────────────────────────────────

interface POSCartTableProps {
  cartItems: POSCartItem[];
  onUpdateQty: (sku: string, qty: number) => void;
  onRemove: (sku: string) => void;
  onClear: () => void;
}

const POSCartTable: React.FC<POSCartTableProps> = ({ cartItems, onUpdateQty, onRemove, onClear }) => (
  <Card className="border border-border bg-card shadow-sm overflow-hidden" aria-label="Shopping Cart">
    <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between space-y-0">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-3.5 w-3.5 text-primary" />
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
          Current Sale Items
          <span className="ml-1.5 font-mono text-muted-foreground text-[10px]">
            ({cartItems.length}/15 unique)
          </span>
        </CardTitle>
      </div>
      {cartItems.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          className="h-7 text-[9px] uppercase tracking-wider text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive transition-all duration-150"
          aria-label="Clear all cart items"
        >
          Clear Cart
        </Button>
      )}
    </CardHeader>
    <CardContent className="p-0">
      <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
        <table className="w-full text-left text-xxs border-collapse" role="table" aria-label="Cart items table">
          <thead>
            <tr className="bg-slate-50/75 border-b border-border font-bold text-muted-foreground uppercase tracking-wider">
              <th className="p-3 pl-4" scope="col">Product</th>
              <th className="p-3 text-right" scope="col">Unit Price</th>
              <th className="p-3 text-center" scope="col">Qty</th>
              <th className="p-3 text-right" scope="col">Subtotal</th>
              <th className="p-3 pr-4 text-center" scope="col">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item) => (
              <tr
                key={item.sku}
                className="border-b border-border/60 hover:bg-slate-50/20 transition duration-150"
                role="row"
              >
                <td className="p-3 pl-4 min-w-[160px]">
                  <p className="font-bold text-slate-800 text-xs leading-tight">{item.name}</p>
                  <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{item.sku}</p>
                  {item.quantity >= item.stock && (
                    <p className="text-[8px] text-amber-600 font-bold mt-0.5 uppercase tracking-wide">Max stock</p>
                  )}
                </td>
                <td className="p-3 text-right font-mono font-semibold text-slate-700">
                  {formatNaira(item.price)}
                </td>
                <td className="p-3 text-center">
                  <div
                    className="inline-flex items-center gap-1 bg-slate-50 border border-border rounded-lg p-0.5"
                    role="group"
                    aria-label={`Quantity for ${item.name}`}
                  >
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.sku, item.quantity - 1)}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-white text-muted-foreground hover:text-foreground transition duration-150 border border-transparent hover:border-border"
                      aria-label={`Decrease quantity for ${item.name}`}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span
                      className="w-7 text-center font-bold text-xs font-mono"
                      aria-label={`Current quantity: ${item.quantity}`}
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.sku, item.quantity + 1)}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-white text-muted-foreground hover:text-foreground transition duration-150 border border-transparent hover:border-border disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={item.quantity >= item.stock}
                      aria-label={`Increase quantity for ${item.name}`}
                      title={item.quantity >= item.stock ? 'Maximum stock reached' : undefined}
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
                    onClick={() => onRemove(item.sku)}
                    className="p-1 rounded hover:bg-destructive/5 text-slate-400 hover:text-destructive transition duration-150"
                    aria-label={`Remove ${item.name} from cart`}
                    title="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {cartItems.length === 0 && (
              <tr>
                <td colSpan={5} className="py-14 text-center text-muted-foreground bg-slate-50/10">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground/15" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide">Your checkout cart is empty</p>
                      <p className="text-[10px] mt-1 text-muted-foreground/70">
                        Search and select items above to start building a sale.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cart summary footer */}
      {cartItems.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50/50 border-t border-border/30 flex justify-between items-center">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
            {cartItems.reduce((s, i) => s + i.quantity, 0)} total units · {cartItems.length} product{cartItems.length !== 1 ? 's' : ''}
          </span>
          <span className="text-xs font-black text-primary font-mono">
            {formatNaira(cartItems.reduce((s, i) => s + i.total, 0))}
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: POSMetadataPanel
// ─────────────────────────────────────────────────────────────────────────────

interface POSMetadataPanelProps {
  formState: CheckoutFormState;
  onChange: (patch: Partial<CheckoutFormState>) => void;
}

const POSMetadataPanel: React.FC<POSMetadataPanelProps> = ({ formState, onChange }) => {
  const [expanded, setExpanded] = useState(false);

  const hasData =
    formState.customerName ||
    formState.customerPhone ||
    formState.prescriptionId ||
    formState.doctorName;

  return (
    <Card className="border border-border bg-card shadow-sm" aria-label="Customer and Prescription Metadata">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left"
        aria-expanded={expanded}
        aria-controls="pos-metadata-body"
      >
        <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-primary" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Customer &amp; Prescription
              {hasData && (
                <Badge variant="success" className="ml-2 text-[8px] px-1 py-0 font-mono">Data Entered</Badge>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <CardDescription className="text-[9px] text-muted-foreground uppercase tracking-wider hidden sm:block">
              Optional
            </CardDescription>
            {expanded
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            }
          </div>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent id="pos-metadata-body" className="px-5 pb-5 pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ── Customer Profile ── */}
            <fieldset className="space-y-3">
              <legend className="text-[10px] font-bold uppercase tracking-wider text-primary border-b border-border/50 pb-1 w-full flex items-center gap-1.5">
                <User className="h-3 w-3" /> Customer Profile
              </legend>
              <div className="space-y-2">
                {[
                  { key: 'customerName', label: 'Full Name', type: 'text', placeholder: 'e.g. Tunde Bakare' },
                  { key: 'customerPhone', label: 'Phone Number', type: 'tel', placeholder: 'e.g. 08031234567' },
                  { key: 'customerEmail', label: 'Email Address', type: 'email', placeholder: 'e.g. customer@example.com' },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label
                      htmlFor={`pos-${key}`}
                      className="block text-[9px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider"
                    >
                      {label}
                    </label>
                    <input
                      id={`pos-${key}`}
                      type={type}
                      value={(formState as any)[key]}
                      onChange={(e) => onChange({ [key]: e.target.value } as any)}
                      placeholder={placeholder}
                      className="h-8 w-full rounded-lg border border-border bg-card px-2.5 text-xxs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    />
                  </div>
                ))}
              </div>
            </fieldset>

            {/* ── Prescription Details ── */}
            <fieldset className="space-y-3">
              <legend className="text-[10px] font-bold uppercase tracking-wider text-primary border-b border-border/50 pb-1 w-full flex items-center gap-1.5">
                <Stethoscope className="h-3 w-3" /> Prescription Details
              </legend>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="pos-prescriptionId" className="block text-[9px] font-semibold text-muted-foreground mb-1 uppercase">
                      Prescription ID
                    </label>
                    <input
                      id="pos-prescriptionId"
                      type="text"
                      value={formState.prescriptionId}
                      onChange={(e) => onChange({ prescriptionId: e.target.value })}
                      placeholder="e.g. RX-9921"
                      className="h-8 w-full rounded-lg border border-border bg-card px-2.5 text-xxs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="pos-doctorName" className="block text-[9px] font-semibold text-muted-foreground mb-1 uppercase">
                      Doctor Name
                    </label>
                    <input
                      id="pos-doctorName"
                      type="text"
                      value={formState.doctorName}
                      onChange={(e) => onChange({ doctorName: e.target.value })}
                      placeholder="e.g. Dr. Lola Adebayo"
                      className="h-8 w-full rounded-lg border border-border bg-card px-2.5 text-xxs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="pos-dosageInstructions" className="block text-[9px] font-semibold text-muted-foreground mb-1 uppercase">
                    Dosage Instructions
                  </label>
                  <textarea
                    id="pos-dosageInstructions"
                    rows={2}
                    value={formState.dosageInstructions}
                    onChange={(e) => onChange({ dosageInstructions: e.target.value })}
                    placeholder="e.g. 1 tablet daily after meals..."
                    className="w-full rounded-lg border border-border bg-card p-2 text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition"
                  />
                </div>
              </div>
            </fieldset>
          </div>

          {/* Billing Notes */}
          <div className="pt-3 border-t border-border/40">
            <label htmlFor="pos-billingNotes" className="block text-[9px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              <FileText className="inline h-3 w-3 mr-1" />
              Billing Notes &amp; Special Instructions
            </label>
            <textarea
              id="pos-billingNotes"
              rows={1}
              value={formState.billingNotes}
              onChange={(e) => onChange({ billingNotes: e.target.value })}
              placeholder="e.g. Corporate sponsorship / deliver to patient address..."
              className="w-full rounded-lg border border-border bg-card p-2 text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: POSOrderSummary
// ─────────────────────────────────────────────────────────────────────────────

interface POSOrderSummaryProps {
  cartItems: POSCartItem[];
  formState: CheckoutFormState;
  onFormStateChange: (patch: Partial<CheckoutFormState>) => void;
  onApplyDiscount: (code: string) => void;
  onCheckout: (e: React.FormEvent) => void;
  onSaveDraft: () => void;
  loadedDraftId: string | null;
  onCancelDraft: () => void;
  isSubmitting: boolean;
  saleError?: string;
  saleSuccess?: string;
}

const POSOrderSummary: React.FC<POSOrderSummaryProps> = ({
  cartItems,
  formState,
  onFormStateChange,
  onApplyDiscount,
  onCheckout,
  onSaveDraft,
  loadedDraftId,
  onCancelDraft,
  isSubmitting,
  saleError,
  saleSuccess
}) => {
  const subtotal = useMemo(() =>
    cartItems.reduce((sum, i) => sum + i.total, 0),
    [cartItems]
  );

  const netTotal = useMemo(() => {
    if (!formState.appliedDiscount) return subtotal;
    if (formState.appliedDiscount.type === 'percentage') {
      return Math.max(0, subtotal - (subtotal * formState.appliedDiscount.value) / 100);
    }
    return Math.max(0, subtotal - formState.appliedDiscount.value);
  }, [subtotal, formState.appliedDiscount]);

  const PAYMENT_METHODS: Array<'CASH' | 'POS' | 'TRANSFER'> = ['CASH', 'POS', 'TRANSFER'];

  const PAYMENT_ICONS = {
    CASH: <Coins className="h-3.5 w-3.5" />,
    POS: <CreditCard className="h-3.5 w-3.5" />,
    TRANSFER: <Zap className="h-3.5 w-3.5" />
  };

  return (
    <Card className="border border-border bg-card shadow-sm" aria-label="Order Summary">
      <CardHeader className="pb-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
            Order Summary
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">

        {/* Cost breakdown */}
        <div className="space-y-2 text-xxs font-mono border-b border-border/60 pb-3">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          {formState.appliedDiscount && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Discount ({formState.appliedDiscount.code}):</span>
              <span>-{formatNaira(subtotal - netTotal)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs font-bold text-slate-800 pt-1 border-t border-dashed border-border">
            <span>Net Total:</span>
            <span className="text-sm font-black text-primary font-mono">{formatNaira(netTotal)}</span>
          </div>
        </div>

        {/* Coupon */}
        <div className="space-y-1.5 p-3 rounded-xl border border-border bg-slate-50/55" role="group" aria-label="Apply discount coupon">
          <label htmlFor="pos-discount-code" className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
            <Tag className="inline h-2.5 w-2.5 mr-1" />
            Apply Coupon Code
          </label>
          <div className="flex gap-2">
            <input
              id="pos-discount-code"
              type="text"
              value={formState.discountCode}
              onChange={(e) => onFormStateChange({ discountCode: e.target.value.toUpperCase() })}
              onKeyDown={(e) => e.key === 'Enter' && onApplyDiscount(formState.discountCode)}
              placeholder="e.g. WELCOME10"
              className="h-8 flex-1 rounded-lg border border-border bg-card px-2.5 text-[10px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase font-mono font-bold"
            />
            <button
              type="button"
              onClick={() => onApplyDiscount(formState.discountCode)}
              className="h-8 px-3 rounded-lg border border-border bg-card hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-700 transition"
              aria-label="Apply coupon code"
            >
              Apply
            </button>
          </div>
          {formState.discountError && (
            <p role="alert" className="text-[9px] text-destructive font-medium mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" /> {formState.discountError}
            </p>
          )}
          {formState.discountSuccess && (
            <p role="status" className="text-[9px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 shrink-0" /> {formState.discountSuccess}
            </p>
          )}
        </div>

        {/* Payment Gateway */}
        <div className="space-y-1.5" role="group" aria-label="Select payment method">
          <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground">
            Payment Gateway
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => onFormStateChange({ paymentMethod: method })}
                className={`py-2 rounded-lg text-[9px] font-bold tracking-wider uppercase border transition duration-150 flex items-center justify-center gap-1 ${
                  formState.paymentMethod === method
                    ? 'bg-primary/5 border-primary text-primary font-black shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-slate-50'
                }`}
                aria-pressed={formState.paymentMethod === method}
                aria-label={`Pay with ${method}`}
              >
                {PAYMENT_ICONS[method]}
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Status alerts */}
        {saleError && (
          <div role="alert" className="flex items-center gap-1.5 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xxs text-destructive font-medium animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="leading-tight">{saleError}</span>
          </div>
        )}
        {saleSuccess && (
          <div role="status" className="flex items-center gap-1.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xxs text-emerald-700 font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="leading-tight">{saleSuccess}</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <form onSubmit={onCheckout}>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full h-10 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 border-none transition-all duration-150 shadow-sm hover:shadow-emerald-200 disabled:opacity-60"
              aria-label="Checkout and print receipt"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Receipt className="h-4 w-4" />
                  Checkout &amp; Print Receipt
                </span>
              )}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            disabled={cartItems.length === 0}
            onClick={onSaveDraft}
            className="w-full h-8 text-[10px] font-bold uppercase tracking-wider border-dashed border-primary/40 hover:bg-primary/5 text-primary transition"
            aria-label={loadedDraftId ? 'Update saved draft' : 'Save as transaction draft'}
          >
            {loadedDraftId ? 'Update Saved Draft' : 'Save As Transaction Draft'}
          </Button>

          {loadedDraftId && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancelDraft}
              className="w-full h-7 text-[8px] font-bold uppercase tracking-widest text-slate-500 border-slate-200 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition"
              aria-label="Cancel editing draft and reset cart"
            >
              Cancel Editing Draft
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: POSDraftsLedger
// ─────────────────────────────────────────────────────────────────────────────

interface POSDraftsLedgerProps {
  drafts: POSTransactionDraft[];
  loadedDraftId: string | null;
  onLoad: (draft: POSTransactionDraft) => void;
  onDelete: (id: string) => void;
}

const POSDraftsLedger: React.FC<POSDraftsLedgerProps> = ({ drafts, loadedDraftId, onLoad, onDelete }) => (
  <Card className="border border-border bg-card shadow-sm" aria-label="Suspended Drafts Ledger">
    <CardHeader className="pb-3 border-b border-border/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Suspended Drafts
          </CardTitle>
        </div>
        <Badge variant="outline" className="font-mono text-[9px] bg-slate-50 text-slate-600 border-slate-200">
          {drafts.length} {drafts.length === 1 ? 'Draft' : 'Drafts'}
        </Badge>
      </div>
      <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
        Offline transaction drafts stored in IndexedDB.
      </CardDescription>
    </CardHeader>
    <CardContent className="p-0 overflow-y-auto max-h-[200px]">
      {drafts.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          <ShoppingBag className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
          <p className="text-[10px] uppercase font-bold text-slate-400">No suspended drafts</p>
          <p className="text-[9px] mt-0.5 text-slate-400/80">Build a cart and click "Save as Draft" to suspend a sale.</p>
        </div>
      ) : (
        <ul role="list" aria-label="Suspended drafts list">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              role="listitem"
              className={`p-3 border-b border-border/50 flex flex-col gap-2 transition duration-150 text-xxs ${
                loadedDraftId === draft.id
                  ? 'bg-primary/5 border-l-2 border-l-primary'
                  : 'bg-slate-50/10 hover:bg-slate-50/40'
              }`}
            >
              <div className="flex justify-between items-start gap-1">
                <div className="min-w-0">
                  <span className="font-bold text-slate-800 text-[11px] truncate block">
                    {draft.customerName || 'Walk-in Customer'}
                    {loadedDraftId === draft.id && (
                      <Badge variant="primary" className="ml-1.5 text-[7px] px-1 py-0 font-mono">Active</Badge>
                    )}
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 block font-mono">
                    {draft.cartItems.length} item{draft.cartItems.length !== 1 ? 's' : ''} · {draft.paymentMethod}
                    {draft.prescriptionId && (
                      <span className="text-primary font-bold ml-1">(Rx: {draft.prescriptionId})</span>
                    )}
                  </span>
                </div>
                <span className="text-[8px] text-muted-foreground font-mono shrink-0">
                  {new Date(draft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex gap-2 justify-between items-center">
                <span className="text-[9px] text-muted-foreground truncate max-w-[110px]">
                  By: {draft.operatorName.split(' ')[0]}
                </span>
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onLoad(draft)}
                    className="h-5 px-2 text-[8px] font-bold uppercase tracking-wider hover:bg-primary/5 hover:text-primary border-slate-200"
                    aria-label={`Load draft for ${draft.customerName || 'walk-in customer'}`}
                    disabled={loadedDraftId === draft.id}
                  >
                    {loadedDraftId === draft.id ? 'Loaded' : 'Load'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => onDelete(draft.id)}
                    className="p-1 rounded hover:bg-destructive/5 text-slate-400 hover:text-destructive transition duration-150"
                    aria-label={`Delete draft for ${draft.customerName || 'walk-in customer'}`}
                    title="Delete draft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// Root: POSCheckoutTerminal
// ─────────────────────────────────────────────────────────────────────────────

export const POSCheckoutTerminal: React.FC<POSCheckoutTerminalProps> = ({
  cartItems,
  onCartChange,
  availableProducts,
  branchName,
  operatorName,
  drafts,
  isSubmitting,
  isSimulating,
  saleError,
  saleSuccess,
  restoredBanner,
  loadedDraftId,
  onCheckout,
  onSaveDraft,
  onLoadDraft,
  onDeleteDraft,
  onApplyDiscount,
  onBackToConsole,
  onDismissBanner,
  formState,
  onFormStateChange,
}) => {

  // ── Cart mutation helpers ──────────────────────────────────────────────────

  const handleAddToCart = useCallback((product: POSInventoryItem) => {
    const existing = cartItems.find(i => i.sku === product.sku);
    const newQty = existing ? existing.quantity + 1 : 1;
    if (newQty > product.quantity) return; // silently reject; caller should show error
    if (!existing && cartItems.length >= 15) return; // cart limit
    if (existing) {
      onCartChange(cartItems.map(i =>
        i.sku === product.sku
          ? { ...i, quantity: newQty, total: newQty * i.price }
          : i
      ));
    } else {
      onCartChange([...cartItems, {
        sku: product.sku,
        name: product.name,
        quantity: 1,
        price: product.price,
        total: product.price,
        stock: product.quantity
      }]);
    }
  }, [cartItems, onCartChange]);

  const handleUpdateQty = useCallback((sku: string, qty: number) => {
    if (qty < 1) {
      onCartChange(cartItems.filter(i => i.sku !== sku));
      return;
    }
    onCartChange(cartItems.map(i =>
      i.sku === sku ? { ...i, quantity: qty, total: qty * i.price } : i
    ));
  }, [cartItems, onCartChange]);

  const handleRemove = useCallback((sku: string) => {
    onCartChange(cartItems.filter(i => i.sku !== sku));
  }, [cartItems, onCartChange]);

  const handleClear = useCallback(() => {
    onCartChange([]);
  }, [onCartChange]);

  const handleCancelDraft = useCallback(() => {
    onCartChange([]);
    onFormStateChange({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      prescriptionId: '',
      doctorName: '',
      dosageInstructions: '',
      billingNotes: '',
      discountCode: '',
      appliedDiscount: null,
      discountError: '',
      discountSuccess: '',
      paymentMethod: 'CASH'
    });
  }, [onCartChange, onFormStateChange]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section
      className="space-y-6 animate-in fade-in duration-200"
      aria-label={`POS Checkout Terminal — ${branchName}`}
    >
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          {isSimulating && onBackToConsole && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToConsole}
              className="h-8 text-xxs uppercase tracking-wider gap-1.5 bg-card border-border hover:bg-slate-50"
              aria-label="Return to command console"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Console
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
                POS Checkout Terminal
              </h2>
              {isSimulating ? (
                <Badge variant="info" className="uppercase font-mono text-[8px] tracking-widest scale-95">
                  Simulation Active
                </Badge>
              ) : (
                <Badge variant="success" className="uppercase font-mono text-[8px] tracking-widest scale-95">
                  Operator Mode
                </Badge>
              )}
            </div>
            <p className="text-xxs text-muted-foreground uppercase tracking-widest leading-normal mt-0.5">
              Register customer purchases for <strong>{branchName}</strong> · Operator: {operatorName}
            </p>
          </div>
        </div>

        {/* Cart item count chip */}
        {cartItems.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-full text-[10px] font-bold text-primary uppercase tracking-wide">
            <ShoppingBag className="h-3.5 w-3.5" />
            {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart
          </div>
        )}
      </div>

      {/* ── Session Restored Banner ── */}
      {restoredBanner && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xxs text-blue-800 font-semibold uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-blue-600 shrink-0" />
            <span>{restoredBanner}</span>
          </div>
          {onDismissBanner && (
            <button
              onClick={onDismissBanner}
              className="text-blue-500 hover:text-blue-700 transition"
              type="button"
              aria-label="Dismiss cart recovery notice"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* ── 4-column POS layout ── */}
      <div className="grid gap-6 lg:grid-cols-4">

        {/* Cols 1–2: Search + Cart + Metadata */}
        <div className="lg:col-span-2 space-y-6">
          <POSProductSearch
            products={availableProducts}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            disabled={isSubmitting}
          />
          <POSCartTable
            cartItems={cartItems}
            onUpdateQty={handleUpdateQty}
            onRemove={handleRemove}
            onClear={handleClear}
          />
          <POSMetadataPanel
            formState={formState}
            onChange={onFormStateChange}
          />
        </div>

        {/* Col 3: Order Summary + Drafts Ledger */}
        <div className="lg:col-span-1 space-y-6">
          <POSOrderSummary
            cartItems={cartItems}
            formState={formState}
            onFormStateChange={onFormStateChange}
            onApplyDiscount={onApplyDiscount}
            onCheckout={onCheckout}
            onSaveDraft={onSaveDraft}
            loadedDraftId={loadedDraftId}
            onCancelDraft={handleCancelDraft}
            isSubmitting={isSubmitting}
            saleError={saleError}
            saleSuccess={saleSuccess}
          />
          <POSDraftsLedger
            drafts={drafts}
            loadedDraftId={loadedDraftId}
            onLoad={onLoadDraft}
            onDelete={onDeleteDraft}
          />
        </div>

        {/* Col 4: slot for caller to inject reconciliation, receipts ledger, etc. */}
        {/* This column is intentionally left open for composition */}
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Named exports for individual sub-components (tree-shaking friendly)
// ─────────────────────────────────────────────────────────────────────────────

export {
  POSProductSearch,
  POSCartTable,
  POSMetadataPanel,
  POSOrderSummary,
  POSDraftsLedger,
};
