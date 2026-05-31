import React, { useState } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/Table';
import { MOCK_REGIONS } from '../../data/mock/mockData';
import { User, UserRole } from '../../domain/entities/models';
import { 
  UserPlus, UserCog, Check, Eye, EyeOff, KeyRound, X, Lock,
  MapPin, Tag, Percent, Truck
} from 'lucide-react';

export const UserManagementPanel: React.FC = () => {
  const { 
    canManageUsers, currentUser, users, createUser, updateUser, deleteUser, resetUserPassword,
    branches, createBranch, updateBranch, deleteBranch,
    categories, createCategory, updateCategory, deleteCategory,
    discounts, createDiscount, updateDiscount, deleteDiscount,
    suppliers, createSupplier, updateSupplier, deleteSupplier
  } = useSession();

  // Navigation Panel State
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'branches' | 'categories' | 'discounts' | 'suppliers'>('staff');
  const [notification, setNotification] = useState('');

  // ----------------------------------------------------
  // 1. STAFF STATE & HANDLERS
  // ----------------------------------------------------
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('DISPENSER');
  const [branchId, setBranchId] = useState('br-ikeja');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleAddOrEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    if (editingUserId) {
      const existingUser = users.find(u => u.id === editingUserId);
      updateUser({
        id: editingUserId,
        name,
        email,
        role,
        branchId: role === 'SUPER_ADMIN' || role === 'REGIONAL_MANAGER' ? undefined : branchId,
        assignedRegionIds: role === 'REGIONAL_MANAGER' ? ['reg-lagos'] : undefined,
        password: existingUser?.password
      });
      setNotification(`Modified staff member: ${name}`);
      setEditingUserId(null);
    } else {
      createUser({
        name,
        email,
        role,
        branchId: role === 'SUPER_ADMIN' || role === 'REGIONAL_MANAGER' ? undefined : branchId,
        assignedRegionIds: role === 'REGIONAL_MANAGER' ? ['reg-lagos'] : undefined,
        password: password.trim() || 'password123'
      });
      setNotification(`Registered new staff member: ${name}`);
    }
    setName('');
    setEmail('');
    setRole('DISPENSER');
    setBranchId('br-ikeja');
    setPassword('');
    setShowPassword(false);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetPasswordVal.trim()) return;

    resetUserPassword(resetTargetUser.id, resetPasswordVal.trim());
    setNotification(`Successfully reset password for ${resetTargetUser.name}`);
    setIsResetModalOpen(false);
    setResetTargetUser(null);
    setResetPasswordVal('');
    
    setTimeout(() => setNotification(''), 3000);
  };

  // ----------------------------------------------------
  // 2. BRANCH STATE & HANDLERS
  // ----------------------------------------------------
  const [brName, setBrName] = useState('');
  const [brCode, setBrCode] = useState('');
  const [brRegionId, setBrRegionId] = useState('reg-lagos');
  const [brLocation, setBrLocation] = useState('');
  const [brType, setBrType] = useState<'warehouse' | 'retail' | 'hybrid'>('retail');
  const [brIsActive, setBrIsActive] = useState(true);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  const handleAddOrEditBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brName || !brCode) return;

    if (editingBranchId) {
      updateBranch({
        id: editingBranchId,
        name: brName,
        code: brCode.toUpperCase().trim(),
        regionId: brRegionId,
        location: brLocation,
        type: brType,
        isActive: brIsActive
      });
      setNotification(`Updated branch: ${brName}`);
      setEditingBranchId(null);
    } else {
      createBranch({
        name: brName,
        code: brCode.toUpperCase().trim(),
        regionId: brRegionId,
        location: brLocation,
        type: brType,
        isActive: brIsActive
      });
      setNotification(`Created branch: ${brName}`);
    }
    setBrName('');
    setBrCode('');
    setBrRegionId('reg-lagos');
    setBrLocation('');
    setBrType('retail');
    setBrIsActive(true);
    setTimeout(() => setNotification(''), 3000);
  };

  // ----------------------------------------------------
  // 3. CATEGORY STATE & HANDLERS
  // ----------------------------------------------------
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIsActive, setCatIsActive] = useState(true);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const handleAddOrEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;

    if (editingCategoryId) {
      updateCategory({
        id: editingCategoryId,
        name: catName,
        description: catDesc,
        isActive: catIsActive
      });
      setNotification(`Updated category: ${catName}`);
      setEditingCategoryId(null);
    } else {
      createCategory({
        name: catName,
        description: catDesc,
        isActive: catIsActive
      });
      setNotification(`Created category: ${catName}`);
    }
    setCatName('');
    setCatDesc('');
    setCatIsActive(true);
    setTimeout(() => setNotification(''), 3000);
  };

  // ----------------------------------------------------
  // 4. DISCOUNT STATE & HANDLERS
  // ----------------------------------------------------
  const [discCodeVal, setDiscCodeVal] = useState('');
  const [discType, setDiscType] = useState<'percentage' | 'fixed'>('percentage');
  const [discValue, setDiscValue] = useState('');
  const [discBranchId, setDiscBranchId] = useState('all');
  const [discIsActive, setDiscIsActive] = useState(true);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);

  const handleAddOrEditDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discCodeVal || !discValue) return;

    const valNum = parseFloat(discValue);
    if (isNaN(valNum)) return;

    if (editingDiscountId) {
      updateDiscount({
        id: editingDiscountId,
        code: discCodeVal.toUpperCase().trim(),
        type: discType,
        value: valNum,
        branchId: discBranchId,
        isActive: discIsActive
      });
      setNotification(`Updated discount coupon: ${discCodeVal}`);
      setEditingDiscountId(null);
    } else {
      createDiscount({
        code: discCodeVal.toUpperCase().trim(),
        type: discType,
        value: valNum,
        branchId: discBranchId,
        isActive: discIsActive
      });
      setNotification(`Created discount coupon: ${discCodeVal}`);
    }
    setDiscCodeVal('');
    setDiscType('percentage');
    setDiscValue('');
    setDiscBranchId('all');
    setDiscIsActive(true);
    setTimeout(() => setNotification(''), 3000);
  };

  // ----------------------------------------------------
  // 5. SUPPLIER STATE & HANDLERS
  // ----------------------------------------------------
  const [supName, setSupName] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supIsActive, setSupIsActive] = useState(true);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  const handleAddOrEditSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName) return;

    if (editingSupplierId) {
      updateSupplier({
        id: editingSupplierId,
        name: supName,
        contactEmail: supEmail,
        contactPhone: supPhone,
        address: supAddress,
        isActive: supIsActive
      });
      setNotification(`Updated supplier: ${supName}`);
      setEditingSupplierId(null);
    } else {
      createSupplier({
        name: supName,
        contactEmail: supEmail,
        contactPhone: supPhone,
        address: supAddress,
        isActive: supIsActive
      });
      setNotification(`Registered supplier: ${supName}`);
    }
    setSupName('');
    setSupEmail('');
    setSupPhone('');
    setSupAddress('');
    setSupIsActive(true);
    setTimeout(() => setNotification(''), 3000);
  };

  if (!canManageUsers || !currentUser) return null;

  const showSubTabs = currentUser.role === 'SUPER_ADMIN';

  const branchOptions = branches.map(b => ({
    value: b.id,
    label: `${b.name} (${b.code})`
  }));

  const discountBranchOptions = [
    { value: 'all', label: 'All Outlets (Nationwide)' },
    ...branchOptions
  ];

  const regionOptions = MOCK_REGIONS.map(r => ({
    value: r.id,
    label: r.name
  }));

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border/20 pb-4">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-bold uppercase tracking-wider text-foreground">
            Enterprise Governance & Master Settings
          </CardTitle>
          <Badge variant="success">Access Approved</Badge>
        </div>
        <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
          Role Clearances: {currentUser.role.replace('_', ' ')} Control Console
        </CardDescription>
      </CardHeader>

      {/* Settings Navigation Tabs */}
      {showSubTabs && (
        <div className="flex flex-wrap gap-1 px-6 py-3 border-b border-border/10 bg-slate-50/20">
          {[
            { id: 'staff', label: 'Staff Governance', icon: UserPlus },
            { id: 'branches', label: 'Outlet Branches', icon: MapPin },
            { id: 'categories', label: 'Categories', icon: Tag },
            { id: 'discounts', label: 'Discount Coupons', icon: Percent },
            { id: 'suppliers', label: 'Suppliers Directory', icon: Truck }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id as any);
                  setNotification('');
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 border ${
                  activeSubTab === tab.id
                    ? 'bg-primary/5 text-primary border-primary/20'
                    : 'border-transparent text-muted-foreground hover:bg-slate-50 hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <CardContent className="p-6">
        
        {notification && (
          <div className="mb-4 flex items-center gap-1.5 p-2.5 rounded-lg bg-success/15 border border-success/20 text-xxs text-success font-semibold uppercase tracking-wider animate-in fade-in duration-200">
            <Check className="h-4 w-4 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* ----------------------------------------------------
            TAB 1: STAFF GOVERNANCE
            ---------------------------------------------------- */}
        {activeSubTab === 'staff' && (
          <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-150">
            {/* Form */}
            <div className="lg:col-span-1 border border-border/50 rounded-xl p-4 bg-slate-50/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <UserPlus className="h-4.5 w-4.5 text-primary" />
                {editingUserId ? "Modify Staff Details" : "Create New Staff Account"}
              </h3>
              <form onSubmit={handleAddOrEditUser} className="space-y-3">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. j.doe@pharmcare.com"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    required
                  />
                </div>
                {!editingUserId && (
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Passcode / Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Set passcode (defaults to password123)"
                        className="h-9 w-full rounded-lg border border-border bg-card pl-3 pr-10 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-3 top-2 text-muted-foreground/60 hover:text-primary transition duration-150"
                        aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Security Role</label>
                    <Select
                      value={role}
                      onChange={(val) => setRole(val as UserRole)}
                      options={[
                        { value: 'SUPER_ADMIN', label: 'Super Admin' },
                        { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
                        { value: 'ADMIN', label: 'Branch Admin' },
                        { value: 'PHARMACIST', label: 'Pharmacist' },
                        { value: 'DISPENSER', label: 'Dispenser' }
                      ]}
                      ariaLabel="Select User Role"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Assign Branch</label>
                    <Select
                      value={branchId}
                      onChange={setBranchId}
                      options={branchOptions}
                      disabled={role === 'SUPER_ADMIN' || role === 'REGIONAL_MANAGER'}
                      ariaLabel="Select Assigned Branch"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" variant="primary" className="flex-1 h-9 text-xs">
                    {editingUserId ? "Apply Changes" : "Create User"}
                  </Button>
                  {editingUserId && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => { setEditingUserId(null); setName(''); setEmail(''); }}
                      className="h-9 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location scope</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs sm:text-sm text-foreground">{u.name}</span>
                          <span className="text-xxs text-muted-foreground">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'SUPER_ADMIN' ? 'destructive' : u.role === 'REGIONAL_MANAGER' ? 'info' : 'primary'}>
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.role === 'SUPER_ADMIN' ? 'Enterprise-wide' : 
                         u.role === 'REGIONAL_MANAGER' ? 'Lagos Zone (LGS)' : 
                         branches.find(b => b.id === u.branchId)?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs hover:text-primary"
                            onClick={() => {
                              setEditingUserId(u.id);
                              setName(u.name);
                              setEmail(u.email);
                              setRole(u.role);
                              setBranchId(u.branchId || 'br-ikeja');
                            }}
                          >
                            Modify
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs text-primary hover:bg-primary/10"
                            onClick={() => {
                              setResetTargetUser(u);
                              setResetPasswordVal('');
                              setShowResetPassword(false);
                              setIsResetModalOpen(true);
                            }}
                          >
                            Reset Pass
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              deleteUser(u.id);
                              setNotification(`Deleted user: ${u.name}`);
                              setTimeout(() => setNotification(''), 3000);
                            }}
                            disabled={u.id === currentUser.id}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            TAB 2: OUTLET BRANCHES CRUD
            ---------------------------------------------------- */}
        {activeSubTab === 'branches' && (
          <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-150">
            {/* Form */}
            <div className="lg:col-span-1 border border-border/50 rounded-xl p-4 bg-slate-50/55">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <MapPin className="h-4.5 w-4.5 text-primary" />
                {editingBranchId ? "Modify Branch Details" : "Register New Branch"}
              </h3>
              <form onSubmit={handleAddOrEditBranch} className="space-y-3">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={brName}
                    onChange={(e) => setBrName(e.target.value)}
                    placeholder="e.g. Kaduna Retail Outlet"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Branch Code</label>
                    <input
                      type="text"
                      value={brCode}
                      onChange={(e) => setBrCode(e.target.value)}
                      placeholder="e.g. KAD-KADA"
                      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-mono uppercase font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Region Scope</label>
                    <Select
                      value={brRegionId}
                      onChange={setBrRegionId}
                      options={regionOptions}
                      ariaLabel="Select Region"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Location Address</label>
                  <input
                    type="text"
                    value={brLocation}
                    onChange={(e) => setBrLocation(e.target.value)}
                    placeholder="e.g. 10 Zaria Road, Kaduna"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Node Type</label>
                    <Select
                      value={brType}
                      onChange={(val) => setBrType(val as any)}
                      options={[
                        { value: 'retail', label: 'Retail Terminal' },
                        { value: 'warehouse', label: 'Distribution Center' },
                        { value: 'hybrid', label: 'Hybrid Node' }
                      ]}
                      ariaLabel="Select Node Type"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Status</label>
                    <Select
                      value={brIsActive ? 'active' : 'inactive'}
                      onChange={(val) => setBrIsActive(val === 'active')}
                      options={[
                        { value: 'active', label: 'Operational' },
                        { value: 'inactive', label: 'Decommissioned' }
                      ]}
                      ariaLabel="Select Branch Status"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" variant="primary" className="flex-1 h-9 text-xs">
                    {editingBranchId ? "Apply Modifications" : "Register Node"}
                  </Button>
                  {editingBranchId && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setEditingBranchId(null);
                        setBrName('');
                        setBrCode('');
                        setBrLocation('');
                      }}
                      className="h-9 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch Details</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Node Type / Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs sm:text-sm text-foreground">{b.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{b.code} • {b.location || 'No address logged'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground uppercase font-semibold">
                        {MOCK_REGIONS.find(r => r.id === b.regionId)?.name || b.regionId}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={b.type === 'warehouse' ? 'info' : 'primary'}>{b.type}</Badge>
                          <Badge variant={b.isActive ? 'success' : 'outline'}>{b.isActive ? 'Active' : 'Offline'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs hover:text-primary"
                            onClick={() => {
                              setEditingBranchId(b.id);
                              setBrName(b.name);
                              setBrCode(b.code);
                              setBrRegionId(b.regionId);
                              setBrLocation(b.location || '');
                              setBrType(b.type);
                              setBrIsActive(b.isActive);
                            }}
                          >
                            Modify
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              deleteBranch(b.id);
                              setNotification(`Decommissioned branch node: ${b.name}`);
                              setTimeout(() => setNotification(''), 3000);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            TAB 3: MEDICINE CATEGORIES CRUD
            ---------------------------------------------------- */}
        {activeSubTab === 'categories' && (
          <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-150">
            {/* Form */}
            <div className="lg:col-span-1 border border-border/50 rounded-xl p-4 bg-slate-50/55">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <Tag className="h-4.5 w-4.5 text-primary" />
                {editingCategoryId ? "Modify Category Details" : "Create Medicine Category"}
              </h3>
              <form onSubmit={handleAddOrEditCategory} className="space-y-3">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Category Title</label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Vitamins & Supplements"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                  <textarea
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Enter short description of medicines categorized under this group..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-card p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Operational Status</label>
                  <Select
                    value={catIsActive ? 'active' : 'inactive'}
                    onChange={(val) => setCatIsActive(val === 'active')}
                    options={[
                      { value: 'active', label: 'Active (Catalog Selectable)' },
                      { value: 'inactive', label: 'Inactive (Disabled)' }
                    ]}
                    ariaLabel="Select Category Status"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" variant="primary" className="flex-1 h-9 text-xs">
                    {editingCategoryId ? "Apply Changes" : "Create Category"}
                  </Button>
                  {editingCategoryId && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCatName('');
                        setCatDesc('');
                      }}
                      className="h-9 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-xs sm:text-sm text-foreground">
                        {c.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {c.description || 'No description logged'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? 'success' : 'outline'}>{c.isActive ? 'Active' : 'Disabled'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs hover:text-primary"
                            onClick={() => {
                              setEditingCategoryId(c.id);
                              setCatName(c.name);
                              setCatDesc(c.description || '');
                              setCatIsActive(c.isActive);
                            }}
                          >
                            Modify
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              deleteCategory(c.id);
                              setNotification(`Deleted category: ${c.name}`);
                              setTimeout(() => setNotification(''), 3000);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            TAB 4: DISCOUNT COUPONS CRUD
            ---------------------------------------------------- */}
        {activeSubTab === 'discounts' && (
          <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-150">
            {/* Form */}
            <div className="lg:col-span-1 border border-border/50 rounded-xl p-4 bg-slate-50/55">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <Percent className="h-4.5 w-4.5 text-primary" />
                {editingDiscountId ? "Modify Coupon Rules" : "Register Coupon Code"}
              </h3>
              <form onSubmit={handleAddOrEditDiscount} className="space-y-3">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Coupon Code</label>
                  <input
                    type="text"
                    value={discCodeVal}
                    onChange={(e) => setDiscCodeVal(e.target.value)}
                    placeholder="e.g. WELCOME10"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-mono uppercase font-bold"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Coupon Type</label>
                    <Select
                      value={discType}
                      onChange={(val) => setDiscType(val as any)}
                      options={[
                        { value: 'percentage', label: 'Percentage (%)' },
                        { value: 'fixed', label: 'Fixed Cash (₦)' }
                      ]}
                      ariaLabel="Select Coupon Type"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Coupon Value</label>
                    <input
                      type="number"
                      value={discValue}
                      onChange={(e) => setDiscValue(e.target.value)}
                      placeholder={discType === 'percentage' ? 'e.g. 10 for 10%' : 'e.g. 500 for 500 Naira'}
                      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-mono font-bold"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Branch Scopes</label>
                  <Select
                    value={discBranchId}
                    onChange={setDiscBranchId}
                    options={discountBranchOptions}
                    ariaLabel="Select Branch Scopes"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Coupon Status</label>
                  <Select
                    value={discIsActive ? 'active' : 'inactive'}
                    onChange={(val) => setDiscIsActive(val === 'active')}
                    options={[
                      { value: 'active', label: 'Active / Redeemable' },
                      { value: 'inactive', label: 'Deactivated' }
                    ]}
                    ariaLabel="Select Coupon Status"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" variant="primary" className="flex-1 h-9 text-xs">
                    {editingDiscountId ? "Apply Modifications" : "Activate Coupon"}
                  </Button>
                  {editingDiscountId && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setEditingDiscountId(null);
                        setDiscCodeVal('');
                        setDiscValue('');
                      }}
                      className="h-9 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coupon Code</TableHead>
                    <TableHead>Type & Value</TableHead>
                    <TableHead>Branch restriction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono font-black text-xs text-foreground uppercase tracking-wider">
                        {d.code}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-semibold font-mono">
                        {d.type === 'percentage' ? `${d.value}% Off` : `₦${d.value.toLocaleString()} Flat`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground uppercase">
                        {d.branchId === 'all' ? 'Nationwide (All Outlets)' : 
                         branches.find(b => b.id === d.branchId)?.name || d.branchId}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.isActive ? 'success' : 'outline'}>{d.isActive ? 'Active' : 'Deactivated'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs hover:text-primary"
                            onClick={() => {
                              setEditingDiscountId(d.id);
                              setDiscCodeVal(d.code);
                              setDiscType(d.type);
                              setDiscValue(d.value.toString());
                              setDiscBranchId(d.branchId);
                              setDiscIsActive(d.isActive);
                            }}
                          >
                            Modify
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              deleteDiscount(d.id);
                              setNotification(`Deleted coupon: ${d.code}`);
                              setTimeout(() => setNotification(''), 3000);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            TAB 5: SUPPLIERS DIRECTORY CRUD
            ---------------------------------------------------- */}
        {activeSubTab === 'suppliers' && (
          <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-150">
            {/* Form */}
            <div className="lg:col-span-1 border border-border/50 rounded-xl p-4 bg-slate-50/55">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <Truck className="h-4.5 w-4.5 text-primary" />
                {editingSupplierId ? "Modify Supplier Details" : "Register Distributor Partner"}
              </h3>
              <form onSubmit={handleAddOrEditSupplier} className="space-y-3">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Company Name</label>
                  <input
                    type="text"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="e.g. Swipha Pharmaceuticals"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="e.g. info@swipha.com.ng"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="e.g. +2348011223344"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Factory / Office Address</label>
                  <input
                    type="text"
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    placeholder="e.g. Plot 5, Dopemu Road, Lagos"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Partnership Status</label>
                  <Select
                    value={supIsActive ? 'active' : 'inactive'}
                    onChange={(val) => setSupIsActive(val === 'active')}
                    options={[
                      { value: 'active', label: 'Active / Trusted Distributor' },
                      { value: 'inactive', label: 'Suspended Partner' }
                    ]}
                    ariaLabel="Select Supplier Status"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" variant="primary" className="flex-1 h-9 text-xs">
                    {editingSupplierId ? "Apply Modifications" : "Link Partner"}
                  </Button>
                  {editingSupplierId && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setEditingSupplierId(null);
                        setSupName('');
                        setSupEmail('');
                        setSupPhone('');
                        setSupAddress('');
                      }}
                      className="h-9 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distributor Partner</TableHead>
                    <TableHead>Contact details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs sm:text-sm text-foreground">{s.name}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">{s.address || 'No address logged'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex flex-col font-mono text-[10px]">
                          <span>{s.contactEmail || 'N/A'}</span>
                          <span>{s.contactPhone || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.isActive ? 'success' : 'outline'}>{s.isActive ? 'Trusted' : 'Suspended'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs hover:text-primary"
                            onClick={() => {
                              setEditingSupplierId(s.id);
                              setSupName(s.name);
                              setSupEmail(s.contactEmail || '');
                              setSupPhone(s.contactPhone || '');
                              setSupAddress(s.address || '');
                              setSupIsActive(s.isActive);
                            }}
                          >
                            Modify
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="h-7 text-xxs text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              deleteSupplier(s.id);
                              setNotification(`Deleted supplier: ${s.name}`);
                              setTimeout(() => setNotification(''), 3000);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

      </CardContent>

      {/* Reset Password Modal */}
      {isResetModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/40">
              <div className="flex items-center gap-2">
                <Lock className="h-4.5 w-4.5 text-primary" />
                <h2 id="reset-modal-title" className="text-base font-bold uppercase tracking-wider text-foreground">
                  Reset Password
                </h2>
              </div>
              <button 
                onClick={() => { setIsResetModalOpen(false); setResetTargetUser(null); }} 
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
                aria-label="Close modal"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmResetPassword} className="p-6 space-y-4">
              <p className="text-xs text-foreground leading-relaxed">
                Assign a new security passcode for <strong className="text-slate-800">{resetTargetUser.name}</strong>. The user must use this new passcode on their next login session.
              </p>

              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  New Security Passcode
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground/60" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    placeholder="Enter new password (e.g. fatimanew123)"
                    className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-10 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-mono font-bold"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 text-muted-foreground/60 hover:text-primary transition duration-150"
                    aria-label={showResetPassword ? "Hide passcode" : "Show passcode"}
                  >
                    {showResetPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/30">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setIsResetModalOpen(false); setResetTargetUser(null); }} 
                  className="h-9 text-xxs uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="h-9 text-xxs uppercase tracking-wider"
                >
                  Save Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
};
