import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { InventoryItem } from '../../domain/entities/models';
import { MockInventoryRepository } from '../../data/mock/inventoryRepo';

// Shared instance of repo for consistency
const inventoryRepo = new MockInventoryRepository();

export const useInventoryUseCase = () => {
  const { selectedRegionId, selectedOutletId, isSyncing, branches } = useSession();
  const [rawInventory, setRawInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await inventoryRepo.getInventory();
      setRawInventory([...data]);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync inventory whenever selector changes or is refreshed
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory, selectedRegionId, selectedOutletId]);

  // Compute scoped/filtered inventory
  const scopedInventory = useMemo(() => {
    let list = rawInventory;
    if (selectedOutletId !== 'all') {
      list = rawInventory.filter(i => i.branchId === selectedOutletId);
    } else if (selectedRegionId !== 'all') {
      const regionBranchIds = branches.filter(b => b.regionId === selectedRegionId).map(b => b.id);
      list = rawInventory.filter(i => regionBranchIds.includes(i.branchId));
    }
    // Sort so depleted stock items bubble up to prompt action
    return [...list].sort((a, b) => a.quantity - b.quantity);
  }, [rawInventory, selectedRegionId, selectedOutletId]);

  // Automated Central Warehouse backup query
  const checkWarehouseBackup = useCallback(async (sku: string): Promise<InventoryItem | undefined> => {
    return inventoryRepo.getCentralWarehouseStock(sku);
  }, []);

  const addProduct = useCallback(async (itemData: Omit<InventoryItem, 'id'>) => {
    setIsLoading(true);
    try {
      await inventoryRepo.createItem(itemData);
      await fetchInventory();
    } catch (err) {
      console.error("Failed to add product:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchInventory]);

  const updateProduct = useCallback(async (updatedItem: InventoryItem) => {
    setIsLoading(true);
    try {
      await inventoryRepo.updateItem(updatedItem);
      await fetchInventory();
    } catch (err) {
      console.error("Failed to update product:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchInventory]);

  const deleteProduct = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await inventoryRepo.deleteItem(id);
      await fetchInventory();
    } catch (err) {
      console.error("Failed to delete product:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchInventory]);

  return {
    inventory: scopedInventory,
    rawInventory,
    isLoading: isLoading || isSyncing,
    refetch: fetchInventory,
    checkWarehouseBackup,
    addProduct,
    updateProduct,
    deleteProduct
  };
};
