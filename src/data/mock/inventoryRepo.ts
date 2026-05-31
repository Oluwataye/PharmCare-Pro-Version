import { IInventoryRepository } from '../interfaces/repositories';
import { InventoryItem } from '../../domain/entities/models';
import { generateMockInventory } from './mockData';

// Shared state for the demo session
let _inventoryDb: InventoryItem[] = [];

export class MockInventoryRepository implements IInventoryRepository {
  constructor() {
    if (_inventoryDb.length === 0) {
      _inventoryDb = generateMockInventory();
    }
  }

  async getInventory(branchId?: string): Promise<InventoryItem[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    if (branchId && branchId !== 'all') {
      return _inventoryDb.filter(item => item.branchId === branchId);
    }
    return [..._inventoryDb];
  }

  async updateStock(branchId: string, sku: string, deltaQty: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const itemIndex = _inventoryDb.findIndex(item => item.branchId === branchId && item.sku === sku);
    
    if (itemIndex >= 0) {
      const currentQty = _inventoryDb[itemIndex].quantity;
      _inventoryDb[itemIndex] = {
        ..._inventoryDb[itemIndex],
        quantity: Math.max(0, currentQty + deltaQty)
      };
    } else {
      // If product does not exist yet at destination branch (edge case)
      // Find sample item from warehouse to copy metadata
      const template = _inventoryDb.find(item => item.sku === sku);
      if (template) {
        _inventoryDb.push({
          ...template,
          id: `inv-new-${Date.now()}-${Math.random()}`,
          branchId,
          quantity: Math.max(0, deltaQty),
          batchNumber: `BAT-NEW-${Math.floor(Math.random() * 9000) + 1000}`
        });
      }
    }
  }

  async getCentralWarehouseStock(sku: string): Promise<InventoryItem | undefined> {
    // Queries Central Warehouse ('br-warehouse')
    return _inventoryDb.find(item => item.sku === sku && item.branchId === 'br-warehouse');
  }

  async createItem(itemData: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const newItem: InventoryItem = {
      ...itemData,
      id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    _inventoryDb.push(newItem);
    return newItem;
  }

  async updateItem(updatedItem: InventoryItem): Promise<InventoryItem> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const index = _inventoryDb.findIndex(item => item.id === updatedItem.id);
    if (index >= 0) {
      _inventoryDb[index] = updatedItem;
      return updatedItem;
    }
    throw new Error(`Inventory item with ID ${updatedItem.id} not found.`);
  }

  async deleteItem(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    _inventoryDb = _inventoryDb.filter(item => item.id !== id);
  }
}
