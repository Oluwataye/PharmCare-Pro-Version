import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { User } from '../../domain/entities/models';
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
      const branch = MOCK_BRANCHES.find(b => b.id === branchId);
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
