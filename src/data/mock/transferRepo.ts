import { ITransferRepository } from '../interfaces/repositories';
import { StockTransfer } from '../../domain/entities/models';

let _transfersDb: StockTransfer[] = [
  {
    id: 'tx-101',
    sourceBranchId: 'br-warehouse',
    sourceBranchName: 'Central Distribution Warehouse',
    destinationBranchId: 'br-ikeja',
    destinationBranchName: 'Ikeja Outlet',
    productId: 'inv-1',
    productName: 'Amoxicillin 500mg',
    sku: 'MED-AMX-500',
    quantity: 200,
    status: 'pending',
    requestedBy: 'usr-ad',
    requestedByName: 'Dr. Chinedu Okafor',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 3600000).toISOString()
  },
  {
    id: 'tx-102',
    sourceBranchId: 'br-warehouse',
    sourceBranchName: 'Central Distribution Warehouse',
    destinationBranchId: 'br-lekki',
    destinationBranchName: 'Lekki Phase 1 Outlet',
    productId: 'inv-4',
    productName: 'Artemether-Lumefantrine (Coartem)',
    sku: 'MED-COA-024',
    quantity: 150,
    status: 'in_transit',
    requestedBy: 'usr-ph',
    requestedByName: 'Dr. Fatima Umar',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString()
  }
];

export class MockTransferRepository implements ITransferRepository {
  async getTransfers(branchId?: string): Promise<StockTransfer[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    if (branchId && branchId !== 'all') {
      return _transfersDb.filter(t => t.sourceBranchId === branchId || t.destinationBranchId === branchId);
    }
    return _transfersDb;
  }

  async createTransfer(transfer: Omit<StockTransfer, 'id' | 'createdAt' | 'updatedAt'>): Promise<StockTransfer> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newTx: StockTransfer = {
      ...transfer,
      id: `tx-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    _transfersDb = [newTx, ..._transfersDb];
    return newTx;
  }

  async updateTransferStatus(
    id: string, 
    status: StockTransfer['status'], 
    actorId: string, 
    actorName: string
  ): Promise<StockTransfer> {
    await new Promise(resolve => setTimeout(resolve, 250));
    const txIndex = _transfersDb.findIndex(t => t.id === id);
    if (txIndex < 0) {
      throw new Error("Transfer record not found");
    }

    const updated = {
      ..._transfersDb[txIndex],
      status,
      approvedBy: actorId,
      approvedByName: actorName,
      updatedAt: new Date().toISOString()
    };
    _transfersDb = _transfersDb.map(t => t.id === id ? updated : t);
    return updated;
  }
}
