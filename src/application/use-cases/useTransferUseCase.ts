import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { StockTransfer } from '../../domain/entities/models';
import { MockTransferRepository } from '../../data/mock/transferRepo';
import { MockInventoryRepository } from '../../data/mock/inventoryRepo';
import { stockRules } from '../../domain/services/stockRules';
import { MOCK_BRANCHES } from '../../data/mock/mockData';

const transferRepo = new MockTransferRepository();
const inventoryRepo = new MockInventoryRepository();

export const useTransferUseCase = (onInventoryMutated?: () => void) => {
  const { currentUser, selectedRegionId, selectedOutletId } = useSession();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await transferRepo.getTransfers();
      setTransfers(data);
    } catch (err) {
      console.error("Failed to load transfers:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const scopedTransfers = useMemo(() => {
    if (!currentUser) return [];
    let list = transfers;
    
    // Narrow down based on selected scoping filters
    if (selectedOutletId !== 'all') {
      list = transfers.filter(t => t.sourceBranchId === selectedOutletId || t.destinationBranchId === selectedOutletId);
    } else if (selectedRegionId !== 'all') {
      const regionBranchIds = MOCK_BRANCHES.filter(b => b.regionId === selectedRegionId).map(b => b.id);
      list = transfers.filter(t => regionBranchIds.includes(t.sourceBranchId) || regionBranchIds.includes(t.destinationBranchId));
    }

    // Role specific security: ADMIN & DISPENSER can only see transfers that pertain to their branch
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'REGIONAL_MANAGER') {
      const userBranchId = currentUser.branchId!;
      list = list.filter(t => t.sourceBranchId === userBranchId || t.destinationBranchId === userBranchId);
    }

    return list;
  }, [transfers, selectedRegionId, selectedOutletId, currentUser]);

  const requestTransfer = useCallback(async (
    productId: string, quantity: number, sourceBranchId: string, destBranchId: string
  ) => {
    setIsLoading(true);
    try {
      // 1. Domain Route Validation
      const routeCheck = stockRules.isValidRoute(sourceBranchId, destBranchId);
      if (!routeCheck.allowed) {
        throw new Error(routeCheck.reason);
      }

      // Load source inventory to check stock
      const sourceInv = await inventoryRepo.getInventory(sourceBranchId);
      const sourceItem = sourceInv.find(item => item.id === productId || item.sku === productId);
      
      // 2. Domain Quantity/Stock Validation
      const stockCheck = stockRules.canRequestTransfer(quantity, sourceItem);
      if (!stockCheck.allowed) {
        throw new Error(stockCheck.reason);
      }

      const sourceBranchName = MOCK_BRANCHES.find(b => b.id === sourceBranchId)!.name;
      const destBranchName = MOCK_BRANCHES.find(b => b.id === destBranchId)!.name;

      // 3. Persist Request
      await transferRepo.createTransfer({
        sourceBranchId,
        sourceBranchName,
        destinationBranchId: destBranchId,
        destinationBranchName: destBranchName,
        productId: sourceItem!.id,
        productName: sourceItem!.name,
        sku: sourceItem!.sku,
        quantity,
        status: 'pending',
        requestedBy: currentUser.id,
        requestedByName: currentUser.name
      });

      // Reload
      await fetchTransfers();
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  }, [currentUser, fetchTransfers]);

  const approveTransfer = useCallback(async (transferId: string) => {
    setIsLoading(true);
    try {
      const activeTx = transfers.find(t => t.id === transferId);
      if (!activeTx) throw new Error("Transfer record not found");

      // Verify that source still contains enough quantity
      const sourceInv = await inventoryRepo.getInventory(activeTx.sourceBranchId);
      const sourceItem = sourceInv.find(i => i.sku === activeTx.sku);
      if (!sourceItem || sourceItem.quantity < activeTx.quantity) {
        throw new Error("Source branch no longer has sufficient quantity to fulfill this request.");
      }

      // Update DB entry status
      await transferRepo.updateTransferStatus(transferId, 'received', currentUser.id, currentUser.name);

      // Perform atomic inventory mutations (double-entry ledger)
      await inventoryRepo.updateStock(activeTx.sourceBranchId, activeTx.sku, -activeTx.quantity);
      await inventoryRepo.updateStock(activeTx.destinationBranchId, activeTx.sku, activeTx.quantity);

      // Trigger re-fetch for list and components
      await fetchTransfers();
      if (onInventoryMutated) onInventoryMutated();
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  }, [transfers, currentUser, fetchTransfers, onInventoryMutated]);

  const rejectTransfer = useCallback(async (transferId: string) => {
    setIsLoading(true);
    try {
      await transferRepo.updateTransferStatus(transferId, 'cancelled', currentUser.id, currentUser.name);
      await fetchTransfers();
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  }, [currentUser, fetchTransfers]);

  return {
    transfers: scopedTransfers,
    allTransfers: transfers,
    isLoading,
    requestTransfer,
    approveTransfer,
    rejectTransfer
  };
};
export { MOCK_BRANCHES };
