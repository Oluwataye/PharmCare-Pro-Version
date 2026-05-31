import { InventoryItem, StockTransfer, StaffMember } from '../../domain/entities/models';

export interface IInventoryRepository {
  getInventory(branchId?: string): Promise<InventoryItem[]>;
  updateStock(branchId: string, sku: string, deltaQty: number): Promise<void>;
  getCentralWarehouseStock(sku: string): Promise<InventoryItem | undefined>;
  createItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem>;
  updateItem(item: InventoryItem): Promise<InventoryItem>;
  deleteItem(id: string): Promise<void>;
}

export interface ITransferRepository {
  getTransfers(branchId?: string): Promise<StockTransfer[]>;
  createTransfer(transfer: Omit<StockTransfer, 'id' | 'createdAt' | 'updatedAt'>): Promise<StockTransfer>;
  updateTransferStatus(
    id: string, 
    status: StockTransfer['status'], 
    actorId: string, 
    actorName: string
  ): Promise<StockTransfer>;
}

export interface IStaffRepository {
  getStaff(branchId?: string, regionId?: string): Promise<StaffMember[]>;
  updateStaffStatus(id: string, status: StaffMember['status']): Promise<StaffMember>;
}
