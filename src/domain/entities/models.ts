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
  branchId?: string; // Empty for SUPER_ADMIN or REGIONAL_MANAGER who have broader access
  assignedRegionIds?: string[]; // Used by REGIONAL_MANAGER to scope their visibility
  password?: string;
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

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Discount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // Percentage (e.g. 10 for 10%) or fixed amount (e.g. 500 for 500 Naira)
  branchId: string | 'all'; // Scoped to a specific branch or nationwide
  isActive: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  isActive: boolean;
}

export interface PurchaseOrderItem {
  sku: string;
  productName: string;
  quantity: number;
  unitCost: number;
  branchId: string;
}

export type POStatus = 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  status: POStatus;
  expectedDeliveryDate: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  receivedAt?: string;
  createdAt: string;
  notes?: string;
  totalValue: number;
}

export type NotificationType = 'low_stock' | 'expiry' | 'pending_transfer' | 'reconciliation_mismatch' | 'new_staff' | 'po_received';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  panelTarget?: 'overview' | 'inventory' | 'transfers' | 'sales' | 'governance' | 'reports' | 'purchase-orders';
  isRead: boolean;
  createdAt: string;
  branchId?: string;
  branchName?: string;
}

