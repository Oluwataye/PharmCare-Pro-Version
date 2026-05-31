import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { User, Branch, Category, Discount, Supplier, PurchaseOrder, AppNotification } from '../../domain/entities/models';
import { MOCK_BRANCHES } from '../../data/mock/mockData';
import { MockInventoryRepository } from '../../data/mock/inventoryRepo';

const _inventoryRepo = new MockInventoryRepository();

const INITIAL_USERS: User[] = [
  {
    id: 'usr-sa',
    name: 'Adebayo Folorunsho (CEO)',
    email: 'ceo@pharmcare.com',
    role: 'SUPER_ADMIN',
    password: 'ceo123'
  },
  {
    id: 'usr-rm',
    name: 'Dr. Lola Adebayo (Regional Manager)',
    email: 'l.adebayo@pharmcare.com',
    role: 'REGIONAL_MANAGER',
    assignedRegionIds: ['reg-lagos'],
    password: 'lola123'
  },
  {
    id: 'usr-ad',
    name: 'Dr. Chinedu Okafor (Ikeja Branch Lead)',
    email: 'c.okafor@pharmcare.com',
    role: 'ADMIN',
    branchId: 'br-ikeja',
    password: 'chinedu123'
  },
  {
    id: 'usr-ph',
    name: 'Dr. Fatima Umar (Lekki Pharmacist)',
    email: 'f.umar@pharmcare.com',
    role: 'PHARMACIST',
    branchId: 'br-lekki',
    password: 'fatima123'
  },
  {
    id: 'usr-dp',
    name: 'Kemi Balogun (Ikeja Dispenser)',
    email: 'k.balogun@pharmcare.com',
    role: 'DISPENSER',
    branchId: 'br-ikeja',
    password: 'kemi123'
  }
];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Antibiotics', description: 'Medicines to treat bacterial infections', isActive: true },
  { id: 'cat-2', name: 'Analgesics', description: 'Pain relief medications', isActive: true },
  { id: 'cat-3', name: 'Antimalarials', description: 'Prevention and treatment of malaria', isActive: true },
  { id: 'cat-4', name: 'Antidiabetics', description: 'Blood sugar management therapeutics', isActive: true },
  { id: 'cat-5', name: 'Cardiovascular', description: 'Heart and circulatory system therapeutics', isActive: true },
  { id: 'cat-6', name: 'Gastrointestinal', description: 'Digestive tract disease medications', isActive: true }
];

const INITIAL_DISCOUNTS: Discount[] = [
  { id: 'disc-1', code: 'WELCOME10', type: 'percentage', value: 10, branchId: 'all', isActive: true },
  { id: 'disc-2', code: 'FLAT500', type: 'fixed', value: 500, branchId: 'all', isActive: true },
  { id: 'disc-3', code: 'IKEJASALE', type: 'percentage', value: 15, branchId: 'br-ikeja', isActive: true }
];

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'Emzor Pharmaceuticals Ltd', contactEmail: 'info@emzorpharma.com', contactPhone: '+2348031234567', address: 'Plot 3C, Block A, Isolo Industrial Estate, Lagos', isActive: true },
  { id: 'sup-2', name: 'Fidson Healthcare Plc', contactEmail: 'contact@fidson.com', contactPhone: '+2348029876543', address: 'Fidson Towers, Shonibare Estate, Maryland, Lagos', isActive: true },
  { id: 'sup-3', name: 'GlaxoSmithKline Nigeria', contactEmail: 'customercare@gsk.com', contactPhone: '+2348055551234', address: '1 Industrial Avenue, Ilupeju, Lagos', isActive: true }
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: 'notif-1', type: 'low_stock', severity: 'warning', title: 'Low Stock Alert', message: 'Paracetamol 500mg at Ikeja Outlet is below reorder level (current: 12, reorder: 50).', panelTarget: 'inventory', isRead: false, createdAt: new Date(Date.now() - 1200000).toISOString(), branchId: 'br-ikeja', branchName: 'Ikeja Outlet' },
  { id: 'notif-2', type: 'expiry', severity: 'critical', title: 'Expiry Warning', message: 'Artemether-Lumefantrine (Coartem) at Lekki Phase 1 expires within 14 days.', panelTarget: 'reports', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString(), branchId: 'br-lekki', branchName: 'Lekki Phase 1 Outlet' },
  { id: 'notif-3', type: 'pending_transfer', severity: 'info', title: 'Transfer Awaiting Approval', message: '3 stock transfer requests are pending approval from Ibadan Main Outlet.', panelTarget: 'transfers', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString(), branchId: 'br-ibadan', branchName: 'Ibadan Main Outlet' },
  { id: 'notif-4', type: 'reconciliation_mismatch', severity: 'warning', title: 'Cash Reconciliation Shortfall', message: 'Lekki Phase 1 Outlet reported ₦300 shortage in yesterday\'s cash drawer reconciliation.', panelTarget: 'sales', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString(), branchId: 'br-lekki', branchName: 'Lekki Phase 1 Outlet' },
  { id: 'notif-5', type: 'low_stock', severity: 'critical', title: 'Critical Stock Level', message: 'Atorvastatin 20mg at Wuse II Premium Outlet is critically low (current: 3, reorder: 30).', panelTarget: 'inventory', isRead: false, createdAt: new Date(Date.now() - 900000).toISOString(), branchId: 'br-abuja-wuse', branchName: 'Wuse II Premium Outlet' },
];

const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-001', supplierId: 'sup-1', supplierName: 'Emzor Pharmaceuticals Ltd',
    items: [
      { sku: 'MED-AMX-500', productName: 'Amoxicillin 500mg', quantity: 200, unitCost: 2200, branchId: 'br-ikeja' },
      { sku: 'MED-PCM-500', productName: 'Paracetamol 500mg', quantity: 500, unitCost: 200, branchId: 'br-ikeja' }
    ],
    status: 'approved', expectedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    createdBy: 'usr-ad', createdByName: 'Dr. Chinedu Okafor', approvedBy: 'usr-sa', approvedByName: 'Adebayo Folorunsho',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), totalValue: 544000, notes: 'Urgent restock for Ikeja Outlet'
  },
  {
    id: 'po-002', supplierId: 'sup-2', supplierName: 'Fidson Healthcare Plc',
    items: [
      { sku: 'MED-MET-500', productName: 'Metformin 500mg', quantity: 300, unitCost: 1100, branchId: 'br-lekki' },
      { sku: 'MED-ATO-020', productName: 'Atorvastatin 20mg', quantity: 100, unitCost: 4000, branchId: 'br-lekki' }
    ],
    status: 'submitted', expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    createdBy: 'usr-ph', createdByName: 'Dr. Fatima Umar',
    createdAt: new Date(Date.now() - 86400000).toISOString(), totalValue: 730000
  },
  {
    id: 'po-003', supplierId: 'sup-3', supplierName: 'GlaxoSmithKline Nigeria',
    items: [
      { sku: 'MED-COA-024', productName: 'Artemether-Lumefantrine (Coartem)', quantity: 150, unitCost: 1600, branchId: 'br-ibadan' }
    ],
    status: 'received', expectedDeliveryDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    createdBy: 'usr-sa', createdByName: 'Adebayo Folorunsho', approvedBy: 'usr-sa', approvedByName: 'Adebayo Folorunsho',
    receivedAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), totalValue: 240000
  }
];

interface SessionContextType {
  currentUser: User;
  isAuthenticated: boolean;
  selectedRegionId: string | 'all';
  selectedOutletId: string | 'all';
  login: (email: string, password?: string) => boolean;
  logout: () => void;
  changeSelection: (regionId: string | 'all', outletId: string | 'all') => void;
  navigateTo?: (panel: 'overview' | 'inventory' | 'transfers' | 'sales' | 'governance' | 'reports' | 'purchase-orders') => void;
  setNavigateTo: (fn: ((panel: 'overview' | 'inventory' | 'transfers' | 'sales' | 'governance' | 'reports' | 'purchase-orders') => void) | undefined) => void;
  
  // User Management Actions
  users: User[];
  createUser: (user: Omit<User, 'id'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  resetUserPassword: (id: string, newPassword: string) => void;

  // Master Data Settings
  branches: Branch[];
  createBranch: (branch: Omit<Branch, 'id'>) => void;
  updateBranch: (branch: Branch) => void;
  deleteBranch: (id: string) => void;

  categories: Category[];
  createCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;

  discounts: Discount[];
  createDiscount: (discount: Omit<Discount, 'id'>) => void;
  updateDiscount: (discount: Discount) => void;
  deleteDiscount: (id: string) => void;

  suppliers: Supplier[];
  createSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;

  // Purchase Orders
  purchaseOrders: PurchaseOrder[];
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'totalValue'>) => void;
  updatePOStatus: (id: string, status: PurchaseOrder['status'], actorId: string, actorName: string) => void;
  receivePurchaseOrder: (id: string) => Promise<void>;

  // Notifications
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => void;

  canManageUsers: boolean;
  isSyncing: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | 'all'>('all');
  const [selectedOutletId, setSelectedOutletId] = useState<string | 'all'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Master Settings States
  const [branches, setBranches] = useState<Branch[]>(MOCK_BRANCHES);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [discounts, setDiscounts] = useState<Discount[]>(INITIAL_DISCOUNTS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);

  // Feature Wave 2 States
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [_navigateTo, _setNavigateTo] = useState<((panel: 'overview' | 'inventory' | 'transfers' | 'sales' | 'governance' | 'reports' | 'purchase-orders') => void) | undefined>(undefined);

  const isAuthenticated = useMemo(() => currentUser !== null, [currentUser]);

  const canManageUsers = useMemo(() => {
    return currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'REGIONAL_MANAGER';
  }, [currentUser]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const login = useCallback((email: string, password?: string) => {
    const profile = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!profile) return false;

    // Check passcode match
    const expectedPass = profile.password || 'password123';
    if (password && password !== expectedPass) {
      return false;
    }

    setCurrentUser(profile);
    
    // Auto lock geographic region & outlet filters on login based on security clearance
    if (profile.role === 'SUPER_ADMIN') {
      setSelectedRegionId('all');
      setSelectedOutletId('all');
    } else if (profile.role === 'REGIONAL_MANAGER') {
      setSelectedRegionId(profile.assignedRegionIds?.[0] || 'reg-lagos');
      setSelectedOutletId('all');
    } else {
      const branchId = profile.branchId!;
      const branch = branches.find(b => b.id === branchId);
      if (branch) {
        setSelectedRegionId(branch.regionId);
        setSelectedOutletId(branchId);
      }
    }
    return true;
  }, [users, branches]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setSelectedRegionId('all');
    setSelectedOutletId('all');
  }, []);

  const changeSelection = useCallback((regionId: string | 'all', outletId: string | 'all') => {
    setIsSyncing(true);
    setTimeout(() => {
      setSelectedRegionId(regionId);
      setSelectedOutletId(outletId);
      setIsSyncing(false);
    }, 350);
  }, []);

  const setNavigateTo = useCallback((fn: ((panel: 'overview' | 'inventory' | 'transfers' | 'sales' | 'governance' | 'reports' | 'purchase-orders') => void) | undefined) => {
    _setNavigateTo(() => fn);
  }, []);

  const createUser = useCallback((userData: Omit<User, 'id'>) => {
    const newUser: User = { ...userData, id: `usr-new-${Date.now()}` };
    setUsers(prev => [...prev, newUser]);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setCurrentUser(prev => prev && prev.id === updatedUser.id ? updatedUser : prev);
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const resetUserPassword = useCallback((id: string, newPassword: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, password: newPassword } : u));
  }, []);

  // CRUD - Branches
  const createBranch = useCallback((branchData: Omit<Branch, 'id'>) => {
    setBranches(prev => [...prev, { ...branchData, id: `br-${Date.now()}` }]);
  }, []);
  const updateBranch = useCallback((updatedBranch: Branch) => {
    setBranches(prev => prev.map(b => b.id === updatedBranch.id ? updatedBranch : b));
  }, []);
  const deleteBranch = useCallback((id: string) => {
    setBranches(prev => prev.filter(b => b.id !== id));
  }, []);

  // CRUD - Categories
  const createCategory = useCallback((categoryData: Omit<Category, 'id'>) => {
    setCategories(prev => [...prev, { ...categoryData, id: `cat-${Date.now()}` }]);
  }, []);
  const updateCategory = useCallback((updatedCategory: Category) => {
    setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
  }, []);
  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  // CRUD - Discounts
  const createDiscount = useCallback((discountData: Omit<Discount, 'id'>) => {
    setDiscounts(prev => [...prev, { ...discountData, id: `disc-${Date.now()}` }]);
  }, []);
  const updateDiscount = useCallback((updatedDiscount: Discount) => {
    setDiscounts(prev => prev.map(d => d.id === updatedDiscount.id ? updatedDiscount : d));
  }, []);
  const deleteDiscount = useCallback((id: string) => {
    setDiscounts(prev => prev.filter(d => d.id !== id));
  }, []);

  // CRUD - Suppliers
  const createSupplier = useCallback((supplierData: Omit<Supplier, 'id'>) => {
    setSuppliers(prev => [...prev, { ...supplierData, id: `sup-${Date.now()}` }]);
  }, []);
  const updateSupplier = useCallback((updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
  }, []);
  const deleteSupplier = useCallback((id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  // Purchase Orders
  const createPurchaseOrder = useCallback((poData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'totalValue'>) => {
    const totalValue = poData.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const newPO: PurchaseOrder = { ...poData, id: `po-${Date.now()}`, createdAt: new Date().toISOString(), totalValue };
    setPurchaseOrders(prev => [...prev, newPO]);
  }, []);

  const updatePOStatus = useCallback((id: string, status: PurchaseOrder['status'], actorId: string, actorName: string) => {
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id !== id) return po;
      const updates: Partial<PurchaseOrder> = { status };
      if (status === 'approved') { updates.approvedBy = actorId; updates.approvedByName = actorName; }
      return { ...po, ...updates };
    }));
  }, []);

  const receivePurchaseOrder = useCallback(async (id: string) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po || po.status !== 'approved') return;
    // Auto-increment inventory for each line item
    for (const item of po.items) {
      await _inventoryRepo.updateStock(item.branchId, item.sku, item.quantity);
    }
    setPurchaseOrders(prev => prev.map(p => p.id === id
      ? { ...p, status: 'received', receivedAt: new Date().toISOString() }
      : p
    ));
    // Add notification
    setNotifications(prev => [{
      id: `notif-${Date.now()}`, type: 'po_received', severity: 'info',
      title: 'Purchase Order Received',
      message: `PO #${id} from ${po.supplierName} has been received and inventory updated.`,
      panelTarget: 'purchase-orders', isRead: false, createdAt: new Date().toISOString()
    }, ...prev]);
  }, [purchaseOrders]);

  // Notifications
  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    setNotifications(prev => [{ ...n, id: `notif-${Date.now()}`, createdAt: new Date().toISOString(), isRead: false }, ...prev]);
  }, []);

  return (
    <SessionContext.Provider value={{
      currentUser: currentUser as User,
      isAuthenticated,
      selectedRegionId,
      selectedOutletId,
      login,
      logout,
      changeSelection,
      navigateTo: _navigateTo,
      setNavigateTo,
      users,
      createUser,
      updateUser,
      deleteUser,
      resetUserPassword,
      branches,
      createBranch,
      updateBranch,
      deleteBranch,
      categories,
      createCategory,
      updateCategory,
      deleteCategory,
      discounts,
      createDiscount,
      updateDiscount,
      deleteDiscount,
      suppliers,
      createSupplier,
      updateSupplier,
      deleteSupplier,
      purchaseOrders,
      createPurchaseOrder,
      updatePOStatus,
      receivePurchaseOrder,
      notifications,
      unreadCount,
      markNotificationRead,
      markAllRead,
      dismissNotification,
      addNotification,
      canManageUsers,
      isSyncing
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
};


