import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { User, UserRole } from '../../domain/entities/models';
import { MOCK_BRANCHES } from '../../data/mock/mockData';

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

interface SessionContextType {
  currentUser: User;
  currentRole: UserRole;
  selectedRegionId: string | 'all';
  selectedOutletId: string | 'all';
  changeRole: (role: UserRole) => void;
  changeSelection: (regionId: string | 'all', outletId: string | 'all') => void;
  
  // Custom access policies
  canManageUsers: boolean;
  isSyncing: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('SUPER_ADMIN');
  const [selectedRegionId, setSelectedRegionId] = useState<string | 'all'>('all');
  const [selectedOutletId, setSelectedOutletId] = useState<string | 'all'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const currentUser = useMemo(() => USER_PROFILES[currentRole], [currentRole]);

  // Fulfills user constraint: "regional manager(can create/modify new users)"
  const canManageUsers = useMemo(() => {
    return currentRole === 'SUPER_ADMIN' || currentRole === 'REGIONAL_MANAGER';
  }, [currentRole]);

  const changeRole = useCallback((role: UserRole) => {
    setCurrentRole(role);
    const profile = USER_PROFILES[role];
    
    if (role === 'SUPER_ADMIN') {
      setSelectedRegionId('all');
      setSelectedOutletId('all');
    } else if (role === 'REGIONAL_MANAGER') {
      setSelectedRegionId('reg-lagos');
      setSelectedOutletId('all');
    } else {
      // Locked to branch
      const branchId = profile.branchId!;
      const branch = MOCK_BRANCHES.find(b => b.id === branchId)!;
      setSelectedRegionId(branch.regionId);
      setSelectedOutletId(branchId);
    }
  }, []);

  const changeSelection = useCallback((regionId: string | 'all', outletId: string | 'all') => {
    setIsSyncing(true);
    setTimeout(() => {
      setSelectedRegionId(regionId);
      setSelectedOutletId(outletId);
      setIsSyncing(false);
    }, 350);
  }, []);

  return (
    <SessionContext.Provider value={{
      currentUser,
      currentRole,
      selectedRegionId,
      selectedOutletId,
      changeRole,
      changeSelection,
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
export { USER_PROFILES };
