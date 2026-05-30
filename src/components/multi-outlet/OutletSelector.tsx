import React, { useMemo } from 'react';
import { useMultiOutlet } from '../../contexts/MultiOutletContext';
import { Select, SelectOption } from '../ui/Select';
import { MapPin, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const OutletSelector: React.FC = () => {
  const { 
    regions, 
    branches, 
    currentUser, 
    selectedRegionId, 
    selectedOutletId, 
    changeSelection,
    isSyncing 
  } = useMultiOutlet();

  // 1. Build Region Dropdown Options depending on User Role
  const regionOptions = useMemo((): SelectOption[] => {
    if (currentUser.role === 'SUPER_ADMIN') {
      return [
        { value: 'all', label: 'All Regions (Consolidated)' },
        ...regions.map(r => ({ value: r.id, label: r.name }))
      ];
    }
    
    if (currentUser.role === 'REGIONAL_MANAGER') {
      const assignedIds = currentUser.assignedRegionIds || [];
      const filtered = regions.filter(r => assignedIds.includes(r.id));
      return filtered.map(r => ({ value: r.id, label: r.name }));
    }

    // Admins and Dispenser/Pharmacist are locked to their branch region
    const activeBranch = branches.find(b => b.id === currentUser.branchId);
    if (activeBranch) {
      const region = regions.find(r => r.id === activeBranch.regionId);
      if (region) {
        return [{ value: region.id, label: region.name }];
      }
    }

    return [{ value: 'all', label: 'Restricted Region' }];
  }, [regions, branches, currentUser]);

  // 2. Build Outlet Dropdown Options depending on Region selection and User Role
  const outletOptions = useMemo((): SelectOption[] => {
    // Determine branches within current scoped region
    const currentRegionFilter = selectedRegionId;
    
    let scopedBranches = branches;
    if (currentRegionFilter !== 'all') {
      scopedBranches = branches.filter(b => b.regionId === currentRegionFilter);
    }

    if (currentUser.role === 'SUPER_ADMIN') {
      const options: SelectOption[] = [{ value: 'all', label: 'All Outlets (Aggregate)' }];
      
      // Group branches by region name
      scopedBranches.forEach(b => {
        const reg = regions.find(r => r.id === b.regionId);
        options.push({
          value: b.id,
          label: `${b.name} (${b.code})`,
          group: reg?.name || 'Other Outlets'
        });
      });
      
      return options;
    }

    if (currentUser.role === 'REGIONAL_MANAGER') {
      const assignedIds = currentUser.assignedRegionIds || [];
      const options: SelectOption[] = [{ value: 'all', label: 'All Outlets in Region' }];
      
      // Filter branches inside assigned regions
      const filteredBranches = scopedBranches.filter(b => assignedIds.includes(b.regionId));
      filteredBranches.forEach(b => {
        options.push({
          value: b.id,
          label: `${b.name} (${b.code})`,
          group: 'Your Region'
        });
      });
      return options;
    }

    // Branch Admin, Pharmacist, and Dispensers are locked to their own outlet
    const userBranch = branches.find(b => b.id === currentUser.branchId);
    if (userBranch) {
      return [{ value: userBranch.id, label: `${userBranch.name} (${userBranch.code})` }];
    }

    return [{ value: 'all', label: 'Restricted Outlet' }];
  }, [branches, regions, currentUser, selectedRegionId]);

  const handleRegionChange = (newRegionId: string) => {
    // If region changes, reset outlet to 'all' or the first available option
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'REGIONAL_MANAGER') {
      changeSelection(newRegionId, 'all');
    }
  };

  const handleOutletChange = (newOutletId: string) => {
    changeSelection(selectedRegionId, newOutletId);
  };

  const isSelectorDisabled = currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'REGIONAL_MANAGER';

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-slate-950/40 backdrop-blur-md pulse-glow">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">Location Scope</h2>
            {isSyncing && (
              <Badge variant="primary" pulse>
                Syncing Scope
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentUser.role === 'SUPER_ADMIN' && 'Full enterprise analytics visibility.'}
            {currentUser.role === 'REGIONAL_MANAGER' && `Scoped to assigned regions: ${currentUser.assignedRegionIds?.join(', ')}`}
            {isSelectorDisabled && `Restricted to assigned branch: ${branches.find(b => b.id === currentUser.branchId)?.name}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        <div className="w-full sm:w-60">
          <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Geographic Region</label>
          <Select
            value={selectedRegionId}
            onChange={handleRegionChange}
            options={regionOptions}
            disabled={isSelectorDisabled}
            ariaLabel="Select geographic region filter"
          />
        </div>
        <div className="w-full sm:w-64">
          <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Outlet / Warehouse</label>
          <Select
            value={selectedOutletId}
            onChange={handleOutletChange}
            options={outletOptions}
            disabled={isSelectorDisabled}
            ariaLabel="Select branch outlet filter"
          />
        </div>
      </div>
      
      {isSelectorDisabled && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/5 border border-warning/10 text-xxs text-warning font-medium md:max-w-xs">
          <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Branch restriction active. Access governed by outlet policy.</span>
        </div>
      )}
    </div>
  );
};
