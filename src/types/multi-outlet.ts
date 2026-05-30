export type UserRole = 'SUPER_ADMIN' | 'REGIONAL_MANAGER' | 'ADMIN' | 'PHARMACIST' | 'DISPENSER';

export interface Region {
  id: string;
  name: string;
  headOfficeAddress?: string;
  isActive: boolean;
}

export type BranchType = 'warehouse' | 'retail' | 'hybrid';

export interface Branch {
  id: string;
  name: string;
  code: string;
  regionId: string;
  location?: string;
  type: BranchType;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string; // Empty for SUPER_ADMIN / REGIONAL_MANAGER who have broader access
  assignedRegionIds?: string[]; // Used by REGIONAL_MANAGER to scope their visibility
}

export interface StockTransfer {
  id: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  status: 'pending' | 'approved' | 'in_transit' | 'received' | 'cancelled';
  requestedBy: string;
  requestedByName: string;
  approvedBy?: string;
  approvedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: UserRole;
  branchId: string;
  branchName: string;
  regionId: string;
  regionName: string;
  status: 'online' | 'offline' | 'on_break';
  shiftStartedAt?: string;
  lastActiveAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  quantity: number;
  reorderLevel: number;
  branchId: string;
  batchNumber?: string;
  expiryDate?: string;
  isWarehouseStock?: boolean;
}

export interface SalesReportEntry {
  id: string;
  branchId: string;
  branchName: string;
  regionName: string;
  totalSales: number;
  transactionCount: number;
  cashReconciled: number;
  posTotal: number;
  transferTotal: number;
  date: string;
}
