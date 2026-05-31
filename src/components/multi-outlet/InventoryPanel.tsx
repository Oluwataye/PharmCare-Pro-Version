import React, { useState, useMemo } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { useInventoryUseCase } from '../../application/use-cases/useInventoryUseCase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableEmpty } from '../ui/Table';
import { formatNaira } from '../../lib/utils';
import { Search, Database, AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '../ui/Button';

export const InventoryPanel: React.FC = () => {
  const { selectedRegionId, selectedOutletId } = useSession();
  const { inventory, rawInventory, isLoading, refetch } = useInventoryUseCase();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockAlert, setSelectedStockAlert] = useState('all');

  // Compute categories dynamically
  const categories = useMemo(() => {
    const list = new Set<string>();
    rawInventory.forEach(item => {
      if (item.category) list.add(item.category);
    });
    return ['all', ...Array.from(list)];
  }, [rawInventory]);

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
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/45"
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
                      {item.sku}
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
                  </TableRow>
                );
              })}

              {filteredInventory.length === 0 && (
                <TableEmpty 
                  columnsCount={6} 
                  message="No matching inventory rows" 
                  description="Adjust your search keywords or stock status filters."
                />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
};
