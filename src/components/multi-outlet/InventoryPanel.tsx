import React, { useState, useMemo } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { useInventoryUseCase } from '../../application/use-cases/useInventoryUseCase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableEmpty } from '../ui/Table';
import { formatNaira } from '../../lib/utils';
import { Search, Database, AlertTriangle, RotateCw, Plus, Edit2, Trash2, X, AlertOctagon, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { MOCK_BRANCHES } from '../../data/mock/mockData';
import { InventoryItem } from '../../domain/entities/models';

export const InventoryPanel: React.FC = () => {
  const { selectedRegionId, selectedOutletId, currentUser } = useSession();
  const { 
    inventory, 
    rawInventory, 
    isLoading, 
    refetch, 
    addProduct, 
    updateProduct, 
    deleteProduct 
  } = useInventoryUseCase();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockAlert, setSelectedStockAlert] = useState('all');

  // Modal and Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formReorderLevel, setFormReorderLevel] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formBatchNumber, setFormBatchNumber] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Delete Confirmation States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingProductName, setDeletingProductName] = useState('');

  // Compute categories dynamically
  const categories = useMemo(() => {
    const list = new Set<string>();
    rawInventory.forEach(item => {
      if (item.category) list.add(item.category);
    });
    return ['all', ...Array.from(list)];
  }, [rawInventory]);

  // Compute branch options with role security scopes
  const allowedBranches = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'SUPER_ADMIN') {
      return MOCK_BRANCHES;
    }
    if (currentUser.role === 'REGIONAL_MANAGER') {
      const regionIds = currentUser.assignedRegionIds || [];
      return MOCK_BRANCHES.filter(b => regionIds.includes(b.regionId));
    }
    // ADMIN
    return MOCK_BRANCHES.filter(b => b.id === currentUser.branchId);
  }, [currentUser]);

  const branchOptions = useMemo(() => {
    return allowedBranches.map(b => ({
      value: b.id,
      label: `${b.name} (${b.code})`
    }));
  }, [allowedBranches]);

  // Role permissions
  const canMutate = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === 'SUPER_ADMIN' || 
           currentUser.role === 'REGIONAL_MANAGER' || 
           currentUser.role === 'ADMIN';
  }, [currentUser]);

  const isSuperAdmin = useMemo(() => {
    return currentUser?.role === 'SUPER_ADMIN';
  }, [currentUser]);

  // Apply filters client-side for immediate responsive feedback
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      // 1. Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSku = item.sku.toLowerCase().includes(query);
        if (!matchesName && !matchesSku) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // 3. Stock alert filter
      if (selectedStockAlert === 'low') {
        return item.quantity > 0 && item.quantity <= item.reorderLevel;
      }
      if (selectedStockAlert === 'depleted') {
        return item.quantity === 0;
      }

      return true;
    });
  }, [inventory, searchQuery, selectedCategory, selectedStockAlert]);

  // Active branch context scope name
  const scopeName = useMemo(() => {
    if (selectedOutletId !== 'all') {
      return `Outlet Specific Stock`;
    }
    if (selectedRegionId !== 'all') {
      return `Region Group Stock`;
    }
    return 'Consolidated Enterprise Ledger';
  }, [selectedRegionId, selectedOutletId]);

  // Actions
  const handleBranchChange = (newBranchId: string) => {
    setFormBranchId(newBranchId);
    const oldBranchCode = MOCK_BRANCHES.find(b => b.id === formBranchId)?.code || '';
    const currentBatchNum = formBatchNumber;
    if (!currentBatchNum || currentBatchNum.startsWith(`BAT-${oldBranchCode}-`)) {
      const newBranchCode = MOCK_BRANCHES.find(b => b.id === newBranchId)?.code || 'LAG';
      setFormBatchNumber(`BAT-${newBranchCode}-${Math.floor(Math.random() * 9000) + 1000}`);
    }
  };

  const handleAddProductClick = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku(`MED-${Math.random().toString(36).substring(2, 5).toUpperCase()}-${Math.floor(Math.random() * 900) + 100}`);
    setFormCategory('');
    setFormPrice('');
    setFormCostPrice('');
    setFormQuantity('50');
    setFormReorderLevel('10');
    
    let defaultBranchId = 'br-ikeja';
    if (currentUser) {
      if (currentUser.branchId) {
        defaultBranchId = currentUser.branchId;
      } else if (allowedBranches.length > 0) {
        if (selectedOutletId !== 'all' && allowedBranches.some(b => b.id === selectedOutletId)) {
          defaultBranchId = selectedOutletId;
        } else {
          defaultBranchId = allowedBranches[0].id;
        }
      }
    }
    setFormBranchId(defaultBranchId);
    
    const selectedBranchCode = MOCK_BRANCHES.find(b => b.id === defaultBranchId)?.code || 'LAG';
    setFormBatchNumber(`BAT-${selectedBranchCode}-${Math.floor(Math.random() * 9000) + 1000}`);
    
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    setFormExpiryDate(oneYearFromNow.toISOString().split('T')[0]);

    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleEditProductClick = (item: InventoryItem) => {
    setEditingProduct(item);
    setFormName(item.name);
    setFormSku(item.sku);
    setFormCategory(item.category);
    setFormPrice(item.price.toString());
    setFormCostPrice(item.costPrice.toString());
    setFormQuantity(item.quantity.toString());
    setFormReorderLevel(item.reorderLevel.toString());
    setFormBranchId(item.branchId);
    setFormBatchNumber(item.batchNumber || '');
    setFormExpiryDate(item.expiryDate || '');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formName.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!formSku.trim()) {
      setFormError("SKU is required.");
      return;
    }
    if (!formCategory.trim()) {
      setFormError("Category is required.");
      return;
    }

    const priceNum = parseFloat(formPrice);
    const costPriceNum = parseFloat(formCostPrice);
    const quantityNum = parseInt(formQuantity, 10);
    const reorderNum = parseInt(formReorderLevel, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError("Retail Price must be a positive number.");
      return;
    }
    if (isNaN(costPriceNum) || costPriceNum <= 0) {
      setFormError("Cost Price must be a positive number.");
      return;
    }
    if (isNaN(quantityNum) || quantityNum < 0) {
      setFormError("Quantity must be a non-negative integer.");
      return;
    }
    if (isNaN(reorderNum) || reorderNum < 0) {
      setFormError("Reorder Level must be a non-negative integer.");
      return;
    }
    if (!formBranchId) {
      setFormError("Please select a target branch.");
      return;
    }

    setIsFormSubmitting(true);
    try {
      const itemData = {
        name: formName.trim(),
        sku: formSku.trim().toUpperCase(),
        category: formCategory.trim(),
        price: priceNum,
        costPrice: costPriceNum,
        quantity: quantityNum,
        reorderLevel: reorderNum,
        branchId: formBranchId,
        batchNumber: formBatchNumber.trim() || undefined,
        expiryDate: formExpiryDate.trim() || undefined,
        isWarehouseStock: MOCK_BRANCHES.find(b => b.id === formBranchId)?.type === 'warehouse'
      };

      if (editingProduct) {
        await updateProduct({
          ...itemData,
          id: editingProduct.id
        });
        setFormSuccess("Product updated successfully!");
      } else {
        await addProduct(itemData);
        setFormSuccess("Product created successfully!");
      }

      setTimeout(() => {
        setIsModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || "An error occurred during save operation.");
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleDeleteClick = (item: InventoryItem) => {
    setDeletingProductId(item.id);
    setDeletingProductName(item.name);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProductId) return;
    setIsFormSubmitting(true);
    try {
      await deleteProduct(deletingProductId);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      alert("Failed to delete item: " + err.message);
    } finally {
      setIsFormSubmitting(false);
      setDeletingProductId(null);
      setDeletingProductName('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
            Branch Stock Sheet & Catalog
          </h2>
          <p className="text-xxs text-muted-foreground uppercase tracking-widest leading-normal">
            Verify current location stock balances and fetch central backup warnings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canMutate && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleAddProductClick}
              className="h-8 text-xxs uppercase tracking-wider gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetch} 
            disabled={isLoading}
            className="h-8 text-xxs uppercase tracking-wider gap-1.5 bg-card border-border"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Stock
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="grid gap-3 sm:grid-cols-4 p-4 rounded-xl border border-border/40 bg-card shadow-sm">
        
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Search Inventory
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name or SKU..."
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:ring-primary placeholder:text-muted-foreground/45"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Category Filter
          </label>
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.filter(c => c !== 'all').map(c => ({ value: c, label: c }))
            ]}
            ariaLabel="Filter inventory by category"
          />
        </div>

        {/* Stock status */}
        <div>
          <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Stock Warnings
          </label>
          <Select
            value={selectedStockAlert}
            onChange={setSelectedStockAlert}
            options={[
              { value: 'all', label: 'All Stock Levels' },
              { value: 'low', label: 'Low Stock Alarms' },
              { value: 'depleted', label: 'Out of Stock' }
            ]}
            ariaLabel="Filter inventory by warnings"
          />
        </div>

      </div>

      {/* Low Stock Warning Banner */}
      {filteredInventory.some(i => i.quantity <= i.reorderLevel) && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-warning/20 bg-warning/5 text-xxs text-warning leading-normal font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider">Critical Inventory Threshold Alarms:</span> Some vital pharmaceutical formulas at this branch are below reorder parameters. Review the listing below and initialize a **Stock Transfer Relocation** request from the Central Warehouse.
          </div>
        </div>
      )}

      {/* Main Stock Table */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold uppercase tracking-wider text-foreground">
              Medicine Catalog Log
            </CardTitle>
            <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
              Current Scope: {scopeName}
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 uppercase font-mono text-[9px]">
            {filteredInventory.length} Items Listed
          </Badge>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Balances</TableHead>
                <TableHead>Retail Price</TableHead>
                <TableHead>Automated Backup Query</TableHead>
                {canMutate && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => {
                const isLowStock = item.quantity <= item.reorderLevel;
                const isDepleted = item.quantity === 0;
                
                // Real-time Central Warehouse check logic for depleted products
                let warehouseBackupQty: number | undefined;
                if (isDepleted && item.branchId !== 'br-warehouse') {
                  const backup = rawInventory.find(i => i.sku === item.sku && i.branchId === 'br-warehouse');
                  if (backup) {
                    warehouseBackupQty = backup.quantity;
                  }
                }

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold text-slate-800 text-xs sm:text-sm">
                      {item.name}
                    </TableCell>
                    <TableCell className="font-mono text-xxs text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{item.sku}</span>
                        <span className="text-[10px] text-primary/70 font-semibold uppercase mt-0.5">
                          {MOCK_BRANCHES.find(b => b.id === item.branchId)?.name || item.branchId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.category}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={`font-bold font-mono text-xs ${
                          isDepleted ? 'text-destructive' :
                          isLowStock ? 'text-warning' : 'text-success'
                        }`}>
                          {item.quantity} units
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase font-semibold">
                          Reorder threshold: {item.reorderLevel}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-800 font-bold">
                      {formatNaira(item.price)}
                    </TableCell>
                    <TableCell>
                      {warehouseBackupQty !== undefined ? (
                        <div className="flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5 text-success animate-pulse shrink-0" />
                          <Badge variant="success" className="font-mono text-[9px] px-1.5 py-0 select-none uppercase">
                            WHSE backup: {warehouseBackupQty}
                          </Badge>
                        </div>
                      ) : isDepleted && item.branchId === 'br-warehouse' ? (
                        <Badge variant="destructive" className="font-mono text-[9px] px-1.5 py-0 select-none uppercase">
                          Warehouse Depleted
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/35 italic font-medium">Local stock secure</span>
                      )}
                    </TableCell>
                    {canMutate && (
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs hover:text-primary gap-1"
                            onClick={() => handleEditProductClick(item)}
                          >
                            <Edit2 className="h-3 w-3" />
                            Modify
                          </Button>
                          {isSuperAdmin && (
                            <Button 
                              variant="ghost" 
                              className="h-7 text-xxs text-destructive hover:bg-destructive/10 gap-1"
                              onClick={() => handleDeleteClick(item)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}

              {filteredInventory.length === 0 && (
                <TableEmpty 
                  columnsCount={canMutate ? 7 : 6} 
                  message="No matching inventory rows" 
                  description="Adjust your search keywords or stock status filters."
                />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Overlay Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/40">
              <h2 id="inventory-modal-title" className="text-base font-bold uppercase tracking-wider text-foreground">
                {editingProduct ? 'Modify Catalog Product' : 'Add New Product to Catalog'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
                aria-label="Close modal"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Name and SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Medicine / Product Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Paracetamol 500mg"
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. MED-PCM-500"
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 uppercase font-mono"
                    required
                    disabled={!!editingProduct}
                  />
                </div>
              </div>

              {/* Category and Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Analgesics"
                    list="form-categories"
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    required
                  />
                  <datalist id="form-categories">
                    {categories.filter(c => c !== 'all').map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Target Branch / Location
                  </label>
                  <Select
                    value={formBranchId}
                    onChange={handleBranchChange}
                    options={branchOptions}
                    disabled={!!editingProduct || currentUser?.role === 'ADMIN'}
                    ariaLabel="Select Target Branch"
                  />
                </div>
              </div>

              {/* Price and Cost Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Retail Price (₦)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 1500"
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Cost Price (₦)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    placeholder="e.g. 1000"
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    required
                  />
                </div>
              </div>

              {/* Quantity and Reorder Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Starting Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="e.g. 100"
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Reorder Warning Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formReorderLevel}
                    onChange={(e) => setFormReorderLevel(e.target.value)}
                    placeholder="e.g. 20"
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Batch Number and Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={formBatchNumber}
                    onChange={(e) => setFormBatchNumber(e.target.value)}
                    placeholder="e.g. BAT-LAG-IKEJ-102"
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
              </div>

              {/* Error / Success Feedback */}
              {formError && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xxs text-destructive leading-normal">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-success/20 bg-success/5 text-xxs text-success leading-normal">
                  <Check className="h-4 w-4 shrink-0 text-success mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isFormSubmitting}
                  className="h-9 text-xxs uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  isLoading={isFormSubmitting}
                  className="h-9 text-xxs uppercase tracking-wider"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-destructive/5">
              <AlertOctagon className="h-5 w-5 text-destructive shrink-0" />
              <h2 id="delete-modal-title" className="text-base font-bold uppercase tracking-wider text-destructive">
                Confirm Product Deletion
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-foreground leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-800">{deletingProductName}</strong> from the catalog? 
              </p>
              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xxs text-destructive leading-normal">
                <strong>WARNING:</strong> This action cannot be undone. Removing this record will erase its entire stock history, SKU configuration, and active balance ledger across the location.
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setIsDeleteModalOpen(false); setDeletingProductId(null); }} 
                  disabled={isFormSubmitting}
                  className="h-9 text-xxs uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="destructive" 
                  isLoading={isFormSubmitting}
                  onClick={handleConfirmDelete}
                  className="h-9 text-xxs uppercase tracking-wider"
                >
                  Permanently Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
