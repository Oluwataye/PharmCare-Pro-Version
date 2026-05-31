import React, { useState, useMemo } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { useInventoryUseCase } from '../../application/use-cases/useInventoryUseCase';
import { useTransferUseCase } from '../../application/use-cases/useTransferUseCase';
import { Button } from '../ui/Button';

import { Select, SelectOption } from '../ui/Select';
import { X, ArrowRight, ShieldCheck, Info } from 'lucide-react';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, branches } = useSession();
  const { rawInventory: inventory } = useInventoryUseCase();
  const { requestTransfer: requestStockTransfer } = useTransferUseCase();

  const [sourceBranchId, setSourceBranchId] = useState('br-warehouse'); // Default to central warehouse
  const [destBranchId, setDestBranchId] = useState(currentUser.branchId || 'br-ikeja');
  const [selectedSku, setSelectedSku] = useState('');
  const [quantity, setQuantity] = useState(10);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Build branch selector options
  const branchOptions = useMemo((): SelectOption[] => {
    return branches.map(b => ({
      value: b.id,
      label: `${b.name} (${b.code})`
    }));
  }, [branches]);

  // 2. Filter products available at the source branch
  const sourceProducts = useMemo(() => {
    return inventory.filter(item => item.branchId === sourceBranchId && item.quantity > 0);
  }, [inventory, sourceBranchId]);

  const productOptions = useMemo((): SelectOption[] => {
    return sourceProducts.map(p => ({
      value: p.sku,
      label: `${p.name} (SKU: ${p.sku} | Avail: ${p.quantity})`
    }));
  }, [sourceProducts]);

  // 3. Find selected item details
  const selectedItem = useMemo(() => {
    return sourceProducts.find(p => p.sku === selectedSku);
  }, [sourceProducts, selectedSku]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (sourceBranchId === destBranchId) {
      setErrorMsg("Source and Destination branches cannot be the same.");
      return;
    }
    if (!selectedSku) {
      setErrorMsg("Please select a product to transfer.");
      return;
    }
    if (quantity <= 0) {
      setErrorMsg("Quantity must be greater than zero.");
      return;
    }
    if (selectedItem && selectedItem.quantity < quantity) {
      setErrorMsg(`Insufficient stock. Source only has ${selectedItem.quantity} units.`);
      return;
    }

    setIsLoading(true);
    try {
      // Find exact product ID in source inventory
      const productId = selectedItem!.id;
      await requestStockTransfer(productId, quantity, sourceBranchId, destBranchId);
      
      setSuccessMsg(`Successfully logged stock transfer request for ${quantity}x ${selectedItem!.name}.`);
      setQuantity(10);
      setSelectedSku('');
      
      // Auto close modal after brief delay
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create transfer request.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/40">
          <h2 id="modal-title" className="text-base font-bold uppercase tracking-wider text-foreground">
            Request Inventory Stock Transfer
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
            aria-label="Close transfer modal"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Transfer Route Visualizer */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="text-center flex-1 min-w-0">
              <span className="block text-xxs font-bold uppercase tracking-wider text-primary/80 mb-0.5">Source Outlet</span>
              <span className="block text-xs font-semibold text-foreground truncate">
                {branches.find(b => b.id === sourceBranchId)?.name || 'Select Source'}
              </span>
            </div>
            <div className="px-3 flex-shrink-0 text-muted-foreground">
              <ArrowRight className="h-4.5 w-4.5" />
            </div>
            <div className="text-center flex-1 min-w-0">
              <span className="block text-xxs font-bold uppercase tracking-wider text-success mb-0.5">Destination Outlet</span>
              <span className="block text-xs font-semibold text-foreground truncate">
                {branches.find(b => b.id === destBranchId)?.name || 'Select Dest'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">From (Source)</label>
              <Select 
                value={sourceBranchId} 
                onChange={(val) => { setSourceBranchId(val); setSelectedSku(''); }} 
                options={branchOptions}
                ariaLabel="Select source branch"
              />
            </div>
            <div>
              <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">To (Destination)</label>
              <Select 
                value={destBranchId} 
                onChange={setDestBranchId} 
                options={branchOptions}
                ariaLabel="Select destination branch"
              />
            </div>
          </div>

          <div>
            <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Select Medicine / Item</label>
            <Select 
              value={selectedSku} 
              onChange={setSelectedSku} 
              options={productOptions} 
              placeholder="Select available drug at source..."
              ariaLabel="Select medicine product"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Quantity to Request</label>
              <input
                type="number"
                min="1"
                max={selectedItem ? selectedItem.quantity : undefined}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900"
              />
            </div>
            {selectedItem && (
              <div className="flex flex-col justify-end p-2.5 rounded-lg border border-border/30 bg-muted/30">
                <span className="text-xxs text-muted-foreground font-medium uppercase">Batch Info</span>
                <span className="text-xs font-mono text-foreground font-semibold truncate mt-0.5">{selectedItem.batchNumber || 'N/A'}</span>
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs text-destructive">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-success/20 bg-success/5 text-xs text-success">
              <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={isLoading}
            >
              Log Request
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
};

