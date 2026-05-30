import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  User, UserRole, Region, Branch, InventoryItem, 
  StockTransfer, StaffMember, SalesReportEntry 
} from '../types/multi-outlet';

// Helper: Generate Mock Data
const MOCK_REGIONS: Region[] = [
  { id: 'reg-lagos', name: 'Lagos Zone', headOfficeAddress: '12 Medical Rd, Ikeja, Lagos', isActive: true },
  { id: 'reg-west', name: 'Western Region', headOfficeAddress: '45 Ring Road, Ibadan, Oyo', isActive: true },
  { id: 'reg-north', name: 'Northern Region', headOfficeAddress: '88 Aminu Kano Crescent, Wuse II, Abuja', isActive: true },
  { id: 'reg-east', name: 'Eastern Region', headOfficeAddress: '10 Okpara Ave, Enugu', isActive: true }
];

const MOCK_BRANCHES: Branch[] = [
  // Lagos Zone
  { id: 'br-warehouse', name: 'Central Distribution Warehouse', code: 'LAG-WHSE', regionId: 'reg-lagos', location: 'Ikeja, Lagos', type: 'warehouse', isActive: true },
  { id: 'br-ikeja', name: 'Ikeja Outlet', code: 'LAG-IKEJ', regionId: 'reg-lagos', location: 'Ikeja Mall, Lagos', type: 'retail', isActive: true },
  { id: 'br-lekki', name: 'Lekki Phase 1 Outlet', code: 'LAG-LEKK', regionId: 'reg-lagos', location: 'Admiralty Way, Lekki', type: 'retail', isActive: true },
  
  // Western
  { id: 'br-ibadan', name: 'Ibadan Main Outlet', code: 'WST-IBAD', regionId: 'reg-west', location: 'Ring Road, Ibadan', type: 'retail', isActive: true },
  { id: 'br-abeokuta', name: 'Abeokuta Express Outlet', code: 'WST-ABEO', regionId: 'reg-west', location: 'Kuto, Abeokuta', type: 'retail', isActive: true },
  
  // Northern
  { id: 'br-abuja-wuse', name: 'Wuse II Premium Outlet', code: 'NTH-WUSE', regionId: 'reg-north', location: 'Wuse II, Abuja', type: 'retail', isActive: true },
  { id: 'br-kano', name: 'Kano Commercial Outlet', code: 'NTH-KANO', regionId: 'reg-north', location: 'Zaria Road, Kano', type: 'retail', isActive: true },
  
  // Eastern
  { id: 'br-enugu', name: 'Enugu Urban Outlet', code: 'EST-ENUG', regionId: 'reg-east', location: 'Ogui Rd, Enugu', type: 'retail', isActive: true },
  { id: 'br-port-harcourt', name: 'PH GRA Outlet', code: 'EST-PHC', regionId: 'reg-east', location: 'GRA Phase 2, Port Harcourt', type: 'retail', isActive: true }
];

// Seed initial inventory items
const INITIAL_PRODUCTS = [
  { name: 'Amoxicillin 500mg', category: 'Antibiotics', price: 3500, costPrice: 2200, reorderLevel: 50, sku: 'MED-AMX-500' },
  { name: 'Paracetamol 500mg', category: 'Analgesics', price: 500, costPrice: 200, reorderLevel: 200, sku: 'MED-PCM-500' },
  { name: 'Ciprofloxacin 500mg', category: 'Antibiotics', price: 4200, costPrice: 2800, reorderLevel: 40, sku: 'MED-CIP-500' },
  { name: 'Artemether-Lumefantrine (Coartem)', category: 'Antimalarials', price: 2800, costPrice: 1600, reorderLevel: 60, sku: 'MED-COA-024' },
  { name: 'Metformin 500mg', category: 'Antidiabetics', price: 1800, costPrice: 1100, reorderLevel: 100, sku: 'MED-MET-500' },
  { name: 'Atorvastatin 20mg', category: 'Cardiovascular', price: 6500, costPrice: 4000, reorderLevel: 30, sku: 'MED-ATO-020' },
  { name: 'Ibuprofen 400mg', category: 'Analgesics', price: 800, costPrice: 400, reorderLevel: 120, sku: 'MED-IBU-400' },
  { name: 'Omeprazole 20mg', category: 'Gastrointestinal', price: 1200, costPrice: 700, reorderLevel: 80, sku: 'MED-OME-020' }
];

// Generate comprehensive inventory across all branches
const generateMockInventory = (): InventoryItem[] => {
  const list: InventoryItem[] = [];
  let idCounter = 1;
  MOCK_BRANCHES.forEach(branch => {
    INITIAL_PRODUCTS.forEach(p => {
      // Warehouse has massive quantity, retail outlets have limited stock
      const isWarehouse = branch.type === 'warehouse';
      const quantity = isWarehouse 
        ? Math.floor(Math.random() * 2000) + 1500 
        : Math.floor(Math.random() * 120) + 10; // Some might trigger low stock!
      
      list.push({
        id: `inv-${idCounter++}`,
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: p.price,
        costPrice: p.costPrice,
        quantity,
        reorderLevel: p.reorderLevel,
        branchId: branch.id,
        batchNumber: `BAT-${branch.code}-${Math.floor(Math.random() * 9000) + 1000}`,
        expiryDate: new Date(Date.now() + (Math.random() * 365 * 2 + 100) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    });
  });
  return list;
};

// Generate 50+ staff members across branches to simulate massive concurrency
const generateMockStaff = (): StaffMember[] => {
  const staff: StaffMember[] = [];
  const roles: UserRole[] = ['ADMIN', 'PHARMACIST', 'DISPENSER'];
  const names = [
    'Chidi Egwu', 'Amina Yusuf', 'Oluwaseun Balogun', 'Ngozi Okoro', 'Emeka Nwosu',
    'Fatima Ibrahim', 'Babajide Cole', 'Blessing Johnson', 'Tunde Folawiyo', 'Chioma Nwachukwu',
    'Abubakar Bello', 'Funke Adeleke', 'Uchechi Madu', 'Kelechi Anyanwu', 'Zainab Musa',
    'Damilola Alao', 'Somtochukwu Ilona', 'Hassan Haruna', ' Yetunde Oshin', 'Obinna Okafor',
    'Halima Sani', 'Adebayo Thomas', 'Mary Easter', 'Victor Nduka', 'Bisi Akande',
    'Chinedu Okeke', 'Rukayat Shittu', 'Kabiru Mohammed', 'Precious Duke', 'Fidelis Onu',
    'Kassim Aliyu', 'Efe Omonigho', 'Lola Shonukan', 'Emmanual Ekong', 'Sadiq Abubakar',
    'Grace Daniel', 'Temitope Ajayi', 'Kingsley Udoh', 'Bilikisu Lawal', 'Ebele Uzor',
    'Nnamdi Azikiwe', ' Aisha Gidado', 'Babatunde Fashola', 'Umar Danbappa', 'Mabel Ezenwa',
    'Segun Awolowo', 'Khadijah Bello', 'Sylvester Udoh', 'Onyinyechi Nkem', 'Mustapha Gombe',
    'Nafisa Sani', 'Sunday Moses', 'Nneka Eze', 'Aliyu Shehu', 'Olanrewaju Davies'
  ];

  names.forEach((name, index) => {
    // Distribute evenly across branches
    const branch = MOCK_BRANCHES[index % MOCK_BRANCHES.length];
    const region = MOCK_REGIONS.find(r => r.id === branch.regionId)!;
    const role = roles[index % roles.length];
    const isOnline = Math.random() > 0.3; // 70% online
    const status = isOnline ? (Math.random() > 0.85 ? 'on_break' : 'online') : 'offline';

    staff.push({
      id: `staff-${index + 1}`,
      name,
      role,
      branchId: branch.id,
      branchName: branch.name,
      regionId: branch.regionId,
      regionName: region.name,
      status,
      shiftStartedAt: status !== 'offline' ? new Date(Date.now() - (Math.random() * 6) * 3600 * 1000).toISOString() : undefined,
      lastActiveAt: new Date(Date.now() - (Math.random() * 30) * 60000).toISOString()
    });
  });

  return staff;
};

// Generate mock historical sales reports for components
const generateMockSalesReports = (): SalesReportEntry[] => {
  const entries: SalesReportEntry[] = [];
  const today = new Date();
  
  MOCK_BRANCHES.forEach(branch => {
    const region = MOCK_REGIONS.find(r => r.id === branch.regionId)!;
    // Generate data for past 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const txCount = Math.floor(Math.random() * 80) + 15;
      const totalSales = txCount * (Math.floor(Math.random() * 4000) + 2500);
      const cashReconciled = totalSales * 0.4;
      const posTotal = totalSales * 0.45;
      const transferTotal = totalSales * 0.15;

      entries.push({
        id: `rep-${branch.id}-${i}`,
        branchId: branch.id,
        branchName: branch.name,
        regionName: region.name,
        totalSales,
        transactionCount: txCount,
        cashReconciled,
        posTotal,
        transferTotal,
        date: date.toISOString().split('T')[0]
      });
    }
  });

  return entries;
};

// Simulated identity states matching selected user role
const USER_PROFILES: Record<UserRole, User> = {
  SUPER_ADMIN: {
    id: 'usr-sa',
    name: 'Chief Executive Officer (CEO)',
    email: 'ceo@pharmcare.com',
    role: 'SUPER_ADMIN'
  },
  REGIONAL_MANAGER: {
    id: 'usr-rm',
    name: 'Lola Adebayo (Lagos Regional Manager)',
    email: 'l.adebayo@pharmcare.com',
    role: 'REGIONAL_MANAGER',
    assignedRegionIds: ['reg-lagos']
  },
  ADMIN: {
    id: 'usr-ad',
    name: 'Dr. Chinedu Okafor (Ikeja Branch Lead)',
    email: 'c.okafor@pharmcare.com',
    role: 'ADMIN',
    branchId: 'br-ikeja'
  },
  PHARMACIST: {
    id: 'usr-ph',
    name: 'Dr. Fatima Umar (Lekki Pharmacist)',
    email: 'f.umar@pharmcare.com',
    role: 'PHARMACIST',
    branchId: 'br-lekki'
  },
  DISPENSER: {
    id: 'usr-dp',
    name: 'Kemi Balogun (Ikeja Dispenser)',
    email: 'k.balogun@pharmcare.com',
    role: 'DISPENSER',
    branchId: 'br-ikeja'
  }
};

interface MultiOutletContextType {
  // Static lists
  regions: Region[];
  branches: Branch[];
  
  // Dynamic stores
  inventory: InventoryItem[];
  transfers: StockTransfer[];
  staff: StaffMember[];
  salesReports: SalesReportEntry[];
  
  // Current session & role simulator
  currentUser: User;
  currentRole: UserRole;
  selectedRegionId: string | 'all';
  selectedOutletId: string | 'all';
  
  // Operations
  changeRole: (role: UserRole) => void;
  changeSelection: (regionId: string | 'all', outletId: string | 'all') => void;
  requestStockTransfer: (productId: string, quantity: number, sourceBranchId: string, destBranchId: string) => Promise<StockTransfer>;
  approveStockTransfer: (transferId: string) => Promise<void>;
  cancelStockTransfer: (transferId: string) => Promise<void>;
  queryCentralWarehouseStock: (sku: string) => InventoryItem | undefined;
  
  // State loaders
  isSyncing: boolean;
  refetchData: () => void;
}

const MultiOutletContext = createContext<MultiOutletContextType | undefined>(undefined);

export const MultiOutletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [salesReports, setSalesReports] = useState<SalesReportEntry[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>('SUPER_ADMIN');
  const [selectedRegionId, setSelectedRegionId] = useState<string | 'all'>('all');
  const [selectedOutletId, setSelectedOutletId] = useState<string | 'all'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const currentUser = useMemo(() => USER_PROFILES[currentRole], [currentRole]);

  // Initial Seed
  useEffect(() => {
    setInventory(generateMockInventory());
    setStaff(generateMockStaff());
    setSalesReports(generateMockSalesReports());
    
    // Seed some initial pending stock transfers
    setTransfers([
      {
        id: 'tx-101',
        sourceBranchId: 'br-warehouse',
        sourceBranchName: 'Central Distribution Warehouse',
        destinationBranchId: 'br-ikeja',
        destinationBranchName: 'Ikeja Outlet',
        productId: 'inv-1', // Amoxicillin at Warehouse
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
        productId: 'inv-4', // Coartem at Warehouse
        productName: 'Artemether-Lumefantrine (Coartem)',
        sku: 'MED-COA-024',
        quantity: 150,
        status: 'in_transit',
        requestedBy: 'usr-ph',
        requestedByName: 'Dr. Fatima Umar',
        createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 3600000).toISOString()
      }
    ]);
  }, []);

  // Enforce access scoping when role changes
  const changeRole = useCallback((role: UserRole) => {
    setCurrentRole(role);
    const profile = USER_PROFILES[role];
    if (role === 'SUPER_ADMIN') {
      setSelectedRegionId('all');
      setSelectedOutletId('all');
    } else if (role === 'REGIONAL_MANAGER') {
      // Lock to their region, e.g. Lagos Zone
      setSelectedRegionId('reg-lagos');
      setSelectedOutletId('all');
    } else {
      // Lock Branch Admin/Pharmacist/Dispenser to their specific branch
      const branchId = profile.branchId!;
      const branch = MOCK_BRANCHES.find(b => b.id === branchId)!;
      setSelectedRegionId(branch.regionId);
      setSelectedOutletId(branchId);
    }
  }, []);

  const changeSelection = useCallback((regionId: string | 'all', outletId: string | 'all') => {
    setIsSyncing(true);
    // Mimic real network latency for state transitions
    setTimeout(() => {
      setSelectedRegionId(regionId);
      setSelectedOutletId(outletId);
      setIsSyncing(false);
    }, 400);
  }, []);

  // Stock Transfer Actions
  const requestStockTransfer = useCallback(async (
    productId: string, quantity: number, sourceBranchId: string, destBranchId: string
  ): Promise<StockTransfer> => {
    setIsSyncing(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const sourceBranch = MOCK_BRANCHES.find(b => b.id === sourceBranchId)!;
    const destBranch = MOCK_BRANCHES.find(b => b.id === destBranchId)!;
    
    // Find item to get info
    const invItem = inventory.find(i => i.id === productId || (i.branchId === sourceBranchId && i.sku === productId));
    if (!invItem) {
      setIsSyncing(false);
      throw new Error("Product not found in source inventory");
    }

    const newTransfer: StockTransfer = {
      id: `tx-${Date.now()}`,
      sourceBranchId,
      sourceBranchName: sourceBranch.name,
      destinationBranchId: destBranchId,
      destinationBranchName: destBranch.name,
      productId: invItem.id,
      productName: invItem.name,
      sku: invItem.sku,
      quantity,
      status: 'pending',
      requestedBy: currentUser.id,
      requestedByName: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTransfers(prev => [newTransfer, ...prev]);
    setIsSyncing(false);
    return newTransfer;
  }, [inventory, currentUser]);

  const approveStockTransfer = useCallback(async (transferId: string) => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    setTransfers(prev => prev.map(t => {
      if (t.id !== transferId) return t;

      // Decrement source branch stock, Increment destination branch stock
      setInventory(invStore => {
        let sourceDeducted = false;
        let destAdded = false;

        const updated = invStore.map(item => {
          // Source deduction
          if (item.sku === t.sku && item.branchId === t.sourceBranchId) {
            if (item.quantity < t.quantity) {
              // Gracefully handle partial stock or throw error
              console.warn("Source has insufficient stock. Running override.");
            }
            sourceDeducted = true;
            return { ...item, quantity: Math.max(0, item.quantity - t.quantity) };
          }
          // Destination addition
          if (item.sku === t.sku && item.branchId === t.destinationBranchId) {
            destAdded = true;
            return { ...item, quantity: item.quantity + t.quantity };
          }
          return item;
        });

        // Handle edge case where item does not exist at destination yet
        if (sourceDeducted && !destAdded) {
          const sourceItem = invStore.find(i => i.sku === t.sku && i.branchId === t.sourceBranchId)!;
          updated.push({
            ...sourceItem,
            id: `inv-new-${Date.now()}`,
            branchId: t.destinationBranchId,
            quantity: t.quantity,
            batchNumber: `BAT-RECV-${Math.floor(Math.random() * 9000) + 1000}`
          });
        }
        return updated;
      });

      return {
        ...t,
        status: 'received', // Auto complete received for demo simplicity
        approvedBy: currentUser.id,
        approvedByName: currentUser.name,
        updatedAt: new Date().toISOString()
      };
    }));

    setIsSyncing(false);
  }, [currentUser]);

  const cancelStockTransfer = useCallback(async (transferId: string) => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'cancelled', updatedAt: new Date().toISOString() } : t));
    setIsSyncing(false);
  }, []);

  // Fulfills Requirement: "Automatically query stock from the central warehouse"
  const queryCentralWarehouseStock = useCallback((sku: string): InventoryItem | undefined => {
    // Find the item matching this SKU in the Central Distribution Warehouse
    return inventory.find(item => item.sku === sku && item.branchId === 'br-warehouse');
  }, [inventory]);

  const refetchData = useCallback(() => {
    setIsSyncing(true);
    setTimeout(() => {
      // Scramble staff statuses a little bit to mimic concurrent live logins
      setStaff(prev => prev.map(s => {
        if (Math.random() > 0.8) {
          const statuses: ('online' | 'offline' | 'on_break')[] = ['online', 'offline', 'on_break'];
          const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
          return {
            ...s,
            status: newStatus,
            shiftStartedAt: newStatus !== 'offline' ? (s.shiftStartedAt || new Date().toISOString()) : undefined,
            lastActiveAt: new Date().toISOString()
          };
        }
        return s;
      }));
      setIsSyncing(false);
    }, 500);
  }, []);

  // Simulate real-time staff status updates every 10 seconds (concurrency simulation)
  useEffect(() => {
    const timer = setInterval(() => {
      setStaff(prev => prev.map(s => {
        // Change status of 2-3 staff members at random
        if (Math.random() > 0.95) {
          const nextStatus = s.status === 'online' ? 'on_break' : (s.status === 'on_break' ? 'offline' : 'online');
          return {
            ...s,
            status: nextStatus,
            shiftStartedAt: nextStatus !== 'offline' ? (s.shiftStartedAt || new Date().toISOString()) : undefined,
            lastActiveAt: new Date().toISOString()
          };
        }
        return s;
      }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <MultiOutletContext.Provider value={{
      regions: MOCK_REGIONS,
      branches: MOCK_BRANCHES,
      inventory,
      transfers,
      staff,
      salesReports,
      currentUser,
      currentRole,
      selectedRegionId,
      selectedOutletId,
      changeRole,
      changeSelection,
      requestStockTransfer,
      approveStockTransfer,
      cancelStockTransfer,
      queryCentralWarehouseStock,
      isSyncing,
      refetchData
    }}>
      {children}
    </MultiOutletContext.Provider>
  );
};

export const useMultiOutlet = () => {
  const context = useContext(MultiOutletContext);
  if (!context) throw new Error("useMultiOutlet must be used within MultiOutletProvider");
  return context;
};
