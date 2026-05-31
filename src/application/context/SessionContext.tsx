import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { User, Branch, Category, Discount, Supplier } from '../../domain/entities/models';
import { MOCK_BRANCHES } from '../../data/mock/mockData';

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

interface SessionContextType {
  currentUser: User;
  isAuthenticated: boolean;
  selectedRegionId: string | 'all';
  selectedOutletId: string | 'all';
  login: (email: string, password?: string) => boolean;
  logout: () => void;
  changeSelection: (regionId: string | 'all', outletId: string | 'all') => void;
  
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

  const isAuthenticated = useMemo(() => currentUser !== null, [currentUser]);

  const canManageUsers = useMemo(() => {
    return currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'REGIONAL_MANAGER';
  }, [currentUser]);

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
  }, [users]);

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

  const createUser = useCallback((userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `usr-new-${Date.now()}`
    };
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
    const newBranch: Branch = {
      ...branchData,
      id: `br-${Date.now()}`
    };
    setBranches(prev => [...prev, newBranch]);
  }, []);

  const updateBranch = useCallback((updatedBranch: Branch) => {
    setBranches(prev => prev.map(b => b.id === updatedBranch.id ? updatedBranch : b));
  }, []);

  const deleteBranch = useCallback((id: string) => {
    setBranches(prev => prev.filter(b => b.id !== id));
  }, []);

  // CRUD - Categories
  const createCategory = useCallback((categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: `cat-${Date.now()}`
    };
    setCategories(prev => [...prev, newCategory]);
  }, []);

  const updateCategory = useCallback((updatedCategory: Category) => {
    setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  // CRUD - Discounts
  const createDiscount = useCallback((discountData: Omit<Discount, 'id'>) => {
    const newDiscount: Discount = {
      ...discountData,
      id: `disc-${Date.now()}`
    };
    setDiscounts(prev => [...prev, newDiscount]);
  }, []);

  const updateDiscount = useCallback((updatedDiscount: Discount) => {
    setDiscounts(prev => prev.map(d => d.id === updatedDiscount.id ? updatedDiscount : d));
  }, []);

  const deleteDiscount = useCallback((id: string) => {
    setDiscounts(prev => prev.filter(d => d.id !== id));
  }, []);

  // CRUD - Suppliers
  const createSupplier = useCallback((supplierData: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`
    };
    setSuppliers(prev => [...prev, newSupplier]);
  }, []);

  const updateSupplier = useCallback((updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
  }, []);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  return (
    <SessionContext.Provider value={{
      currentUser: currentUser as User, // Safe typecast since layout guarantees auth boundaries
      isAuthenticated,
      selectedRegionId,
      selectedOutletId,
      login,
      logout,
      changeSelection,
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
