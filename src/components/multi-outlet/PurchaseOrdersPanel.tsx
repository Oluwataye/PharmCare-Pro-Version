import React, { useState, useMemo } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { POStatus } from '../../domain/entities/models';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatNaira } from '../../lib/utils';
import {
  ShoppingCart, Plus, PackageCheck, ChevronDown, ChevronRight,
  Clock, CheckCircle2, XCircle, Truck, Package, Trash2, Send,
  RefreshCw, AlertTriangle, FileText
} from 'lucide-react';

const STATUS_CONFIG: Record<POStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'Draft',     color: 'bg-slate-100 text-slate-600 border-slate-200',  icon: FileText },
  submitted: { label: 'Submitted', color: 'bg-blue-50 text-blue-700 border-blue-200',      icon: Send },
  approved:  { label: 'Approved',  color: 'bg-amber-50 text-amber-700 border-amber-200',   icon: CheckCircle2 },
  received:  { label: 'Received',  color: 'bg-green-50 text-green-700 border-green-200',   icon: PackageCheck },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-200',         icon: XCircle },
};

const MOCK_PRODUCTS = [
  { sku: 'MED-AMX-500', name: 'Amoxicillin 500mg',                   costPrice: 2200 },
  { sku: 'MED-PCM-500', name: 'Paracetamol 500mg',                   costPrice: 200  },
  { sku: 'MED-CIP-500', name: 'Ciprofloxacin 500mg',                 costPrice: 2800 },
  { sku: 'MED-COA-024', name: 'Artemether-Lumefantrine (Coartem)',    costPrice: 1600 },
  { sku: 'MED-MET-500', name: 'Metformin 500mg',                     costPrice: 1100 },
  { sku: 'MED-ATO-020', name: 'Atorvastatin 20mg',                   costPrice: 4000 },
  { sku: 'MED-IBU-400', name: 'Ibuprofen 400mg',                     costPrice: 400  },
  { sku: 'MED-OME-020', name: 'Omeprazole 20mg',                     costPrice: 700  },
];

interface NewPOItem {
  sku: string;
  productName: string;
  quantity: number;
  unitCost: number;
  branchId: string;
}

export const PurchaseOrdersPanel: React.FC = () => {
  const {
    currentUser, branches, suppliers,
    purchaseOrders, createPurchaseOrder, updatePOStatus, receivePurchaseOrder
  } = useSession();

  const canApprove = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'REGIONAL_MANAGER';
  const canCreate = ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'ADMIN', 'PHARMACIST'].includes(currentUser.role);

  // Filters
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all');
  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isReceiving, setIsReceiving] = useState<string | null>(null);

  // Create PO form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [poNotes, setPONotes] = useState('');
  const [poItems, setPOItems] = useState<NewPOItem[]>([
    { sku: '', productName: '', quantity: 1, unitCost: 0, branchId: branches[0]?.id || '' }
  ]);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Scope POs by role
  const scopedPOs = useMemo(() => {
    let filtered = [...purchaseOrders];
    if (currentUser.role === 'REGIONAL_MANAGER') {
      const regionBranchIds = branches
        .filter(b => currentUser.assignedRegionIds?.includes(b.regionId))
        .map(b => b.id);
      filtered = filtered.filter(po =>
        po.items.some(item => regionBranchIds.includes(item.branchId))
      );
    } else if (['ADMIN', 'PHARMACIST', 'DISPENSER'].includes(currentUser.role)) {
      filtered = filtered.filter(po =>
        po.createdBy === currentUser.id ||
        po.items.some(item => item.branchId === currentUser.branchId)
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(po => po.status === statusFilter);
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [purchaseOrders, statusFilter, currentUser, branches]);

  const totalStats = useMemo(() => ({
    pending: purchaseOrders.filter(po => po.status === 'submitted').length,
    approved: purchaseOrders.filter(po => po.status === 'approved').length,
    totalValue: purchaseOrders.filter(po => po.status !== 'cancelled').reduce((s, po) => s + po.totalValue, 0),
  }), [purchaseOrders]);

  // Form handlers
  const addPOItem = () => setPOItems(prev => [
    ...prev, { sku: '', productName: '', quantity: 1, unitCost: 0, branchId: branches[0]?.id || '' }
  ]);

  const removePOItem = (idx: number) => setPOItems(prev => prev.filter((_, i) => i !== idx));

  const updatePOItem = (idx: number, field: keyof NewPOItem, value: string | number) => {
    setPOItems(prev => {
      const next = [...prev];
      if (field === 'sku') {
        const product = MOCK_PRODUCTS.find(p => p.sku === value);
        next[idx] = { ...next[idx], sku: value as string, productName: product?.name || '', unitCost: product?.costPrice || 0 };
      } else {
        next[idx] = { ...next[idx], [field]: value };
      }
      return next;
    });
  };

  const handleCreatePO = () => {
    if (!selectedSupplierId || poItems.some(i => !i.sku || i.quantity < 1)) return;
    const supplier = suppliers.find(s => s.id === selectedSupplierId)!;
    createPurchaseOrder({
      supplierId: selectedSupplierId,
      supplierName: supplier.name,
      items: poItems.filter(i => i.sku),
      status: 'draft',
      expectedDeliveryDate: expectedDelivery || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      createdBy: currentUser.id,
      createdByName: currentUser.name.split(' (')[0],
      notes: poNotes,
    });
    setCreateSuccess(true);
    setTimeout(() => {
      setCreateSuccess(false);
      setShowCreateForm(false);
      setSelectedSupplierId('');
      setExpectedDelivery('');
      setPONotes('');
      setPOItems([{ sku: '', productName: '', quantity: 1, unitCost: 0, branchId: branches[0]?.id || '' }]);
    }, 1500);
  };

  const handleReceive = async (poId: string) => {
    setIsReceiving(poId);
    await receivePurchaseOrder(poId);
    setIsReceiving(null);
  };

  const poLineTotal = poItems.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">Purchase Orders</h2>
          <p className="text-xxs text-muted-foreground uppercase tracking-widest mt-0.5">
            Manage stock replenishment from suppliers — full lifecycle from draft to received.
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Purchase Order
          </Button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Awaiting Approval', value: totalStats.pending, icon: Clock, color: 'text-blue-600 bg-blue-50' },
          { label: 'Approved (Pending Delivery)', value: totalStats.approved, icon: Truck, color: 'text-amber-600 bg-amber-50' },
          { label: 'Total PO Value', value: formatNaira(totalStats.totalValue), icon: Package, color: 'text-green-600 bg-green-50' },
        ].map(kpi => (
          <Card key={kpi.label} className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${kpi.color}`}>
              <kpi.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-black text-slate-900">{kpi.value}</p>
              <p className="text-xxs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Create PO Form */}
      {showCreateForm && canCreate && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Create New Purchase Order
            </CardTitle>
            <CardDescription>Fill in supplier, products, quantities, and expected delivery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {createSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="font-bold text-green-700 text-sm">Purchase Order Created Successfully!</p>
                <p className="text-xxs text-muted-foreground">Closing form...</p>
              </div>
            ) : (
              <>
                {/* Supplier & Delivery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Supplier *</label>
                    <select
                      value={selectedSupplierId}
                      onChange={e => setSelectedSupplierId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.filter(s => s.isActive).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={expectedDelivery}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setExpectedDelivery(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Order Line Items *</label>
                    <button onClick={addPOItem} className="text-xxs text-primary hover:underline font-bold flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Add Item
                    </button>
                  </div>

                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="bg-slate-50 grid grid-cols-12 gap-2 px-3 py-2 text-xxs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <div className="col-span-4">Product</div>
                      <div className="col-span-2 text-right">Qty</div>
                      <div className="col-span-2 text-right">Unit Cost (₦)</div>
                      <div className="col-span-2">Branch</div>
                      <div className="col-span-1 text-right">Subtotal</div>
                      <div className="col-span-1" />
                    </div>
                    {poItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center border-b border-border/50 last:border-0 hover:bg-slate-50/50">
                        <div className="col-span-4">
                          <select
                            value={item.sku}
                            onChange={e => updatePOItem(idx, 'sku', e.target.value)}
                            className="w-full h-7 rounded border border-border bg-white px-2 text-xxs focus:outline-none focus:ring-1 focus:ring-primary/30"
                          >
                            <option value="">-- Product --</option>
                            {MOCK_PRODUCTS.map(p => (
                              <option key={p.sku} value={p.sku}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number" min={1} value={item.quantity}
                            onChange={e => updatePOItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full h-7 rounded border border-border bg-white px-2 text-xxs text-right focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number" min={0} value={item.unitCost}
                            onChange={e => updatePOItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                            className="w-full h-7 rounded border border-border bg-white px-2 text-xxs text-right focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={item.branchId}
                            onChange={e => updatePOItem(idx, 'branchId', e.target.value)}
                            className="w-full h-7 rounded border border-border bg-white px-2 text-xxs focus:outline-none focus:ring-1 focus:ring-primary/30"
                          >
                            {branches.filter(b => b.isActive && b.type !== 'warehouse').map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-1 text-right text-xxs font-bold text-slate-700">
                          ₦{(item.quantity * item.unitCost).toLocaleString()}
                        </div>
                        <div className="col-span-1 text-right">
                          {poItems.length > 1 && (
                            <button onClick={() => removePOItem(idx)} className="text-destructive hover:bg-red-50 rounded p-0.5">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="px-3 py-2 bg-slate-50 flex justify-end items-center gap-2 border-t border-border">
                      <span className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Order Total:</span>
                      <span className="text-sm font-black text-slate-900">{formatNaira(poLineTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Notes (Optional)</label>
                  <textarea
                    value={poNotes}
                    onChange={e => setPONotes(e.target.value)}
                    rows={2}
                    placeholder="Special instructions, urgency notes..."
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={handleCreatePO}
                    disabled={!selectedSupplierId || poItems.every(i => !i.sku)}
                    className="gap-1.5"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Create PO as Draft
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xxs font-bold uppercase tracking-wider text-muted-foreground mr-1">Filter:</span>
        {(['all', 'draft', 'submitted', 'approved', 'received', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xxs font-bold uppercase tracking-wider border transition-all ${
              statusFilter === s
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            {s !== 'all' && (
              <span className="ml-1.5 opacity-70">
                ({purchaseOrders.filter(po => po.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* PO List */}
      <div className="space-y-3">
        {scopedPOs.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
              <p className="font-bold text-slate-500 text-sm">No Purchase Orders Found</p>
              <p className="text-xxs text-muted-foreground">
                {canCreate ? 'Create your first PO using the button above.' : 'No orders match the current filter.'}
              </p>
            </div>
          </Card>
        ) : (
          scopedPOs.map(po => {
            const cfg = STATUS_CONFIG[po.status];
            const StatusIcon = cfg.icon;
            const isExpanded = expandedPO === po.id;
            const isDeliveryOverdue = po.status === 'approved' && new Date(po.expectedDeliveryDate) < new Date();

            return (
              <Card key={po.id} className={`overflow-hidden transition-shadow hover:shadow-md ${isDeliveryOverdue ? 'border-amber-200' : ''}`}>
                {/* PO Row Header */}
                <button
                  className="w-full text-left px-4 py-3.5 flex items-center gap-4"
                  onClick={() => setExpandedPO(isExpanded ? null : po.id)}
                >
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 items-center min-w-0">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">{po.supplierName}</p>
                      <p className="text-xxs text-muted-foreground">PO #{po.id} · {new Date(po.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-bold border ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      {isDeliveryOverdue && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-xxs text-amber-600 font-bold">
                          <AlertTriangle className="h-3 w-3" /> Overdue
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{formatNaira(po.totalValue)}</p>
                      <p className="text-xxs text-muted-foreground">{po.items.length} line item{po.items.length > 1 ? 's' : ''}</p>
                    </div>
                    <div>
                      <p className="text-xxs text-muted-foreground">Expected delivery</p>
                      <p className="text-xxs font-bold text-slate-700">{new Date(po.expectedDeliveryDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Items Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xxs">
                        <thead className="bg-slate-50">
                          <tr>
                            {['Product', 'SKU', 'Qty', 'Unit Cost', 'Subtotal', 'Destination Branch'].map(h => (
                              <th key={h} className="px-4 py-2 text-left font-bold uppercase tracking-wider text-muted-foreground first:pl-4">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {po.items.map((item, idx) => {
                            const branch = branches.find(b => b.id === item.branchId);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-semibold text-slate-800">{item.productName}</td>
                                <td className="px-4 py-2.5 font-mono text-muted-foreground">{item.sku}</td>
                                <td className="px-4 py-2.5 font-bold text-slate-800">{item.quantity}</td>
                                <td className="px-4 py-2.5">{formatNaira(item.unitCost)}</td>
                                <td className="px-4 py-2.5 font-bold text-primary">{formatNaira(item.quantity * item.unitCost)}</td>
                                <td className="px-4 py-2.5">{branch?.name || item.branchId}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer with meta + actions */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="text-xxs text-muted-foreground space-y-0.5">
                        <p>Created by: <span className="font-bold text-slate-700">{po.createdByName}</span></p>
                        {po.approvedByName && <p>Approved by: <span className="font-bold text-slate-700">{po.approvedByName}</span></p>}
                        {po.receivedAt && <p>Received: <span className="font-bold text-green-700">{new Date(po.receivedAt).toLocaleString()}</span></p>}
                        {po.notes && <p>Notes: <span className="italic text-slate-600">{po.notes}</span></p>}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Submit draft */}
                        {po.status === 'draft' && po.createdBy === currentUser.id && (
                          <Button size="sm" variant="outline" className="h-7 text-xxs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => updatePOStatus(po.id, 'submitted', currentUser.id, currentUser.name)}>
                            <Send className="h-3 w-3" /> Submit for Approval
                          </Button>
                        )}
                        {/* Cancel draft */}
                        {(po.status === 'draft' || po.status === 'submitted') && (canApprove || po.createdBy === currentUser.id) && (
                          <Button size="sm" variant="outline" className="h-7 text-xxs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => updatePOStatus(po.id, 'cancelled', currentUser.id, currentUser.name)}>
                            <XCircle className="h-3 w-3" /> Cancel
                          </Button>
                        )}
                        {/* Approve */}
                        {po.status === 'submitted' && canApprove && (
                          <Button size="sm" className="h-7 text-xxs gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={() => updatePOStatus(po.id, 'approved', currentUser.id, currentUser.name.split(' (')[0])}>
                            <CheckCircle2 className="h-3 w-3" /> Approve PO
                          </Button>
                        )}
                        {/* Receive */}
                        {po.status === 'approved' && (
                          <Button size="sm" className="h-7 text-xxs gap-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleReceive(po.id)}
                            disabled={isReceiving === po.id}
                          >
                            {isReceiving === po.id
                              ? <><RefreshCw className="h-3 w-3 animate-spin" /> Updating Inventory...</>
                              : <><PackageCheck className="h-3 w-3" /> Mark as Received & Update Inventory</>
                            }
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
