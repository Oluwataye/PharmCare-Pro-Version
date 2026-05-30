import React, { useState } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/Table';
import { MOCK_BRANCHES } from '../../data/mock/mockData';
import { User, UserRole } from '../../domain/entities/models';
import { UserPlus, UserCog, Check } from 'lucide-react';

export const UserManagementPanel: React.FC = () => {
  const { canManageUsers, currentUser, users, createUser, updateUser, deleteUser } = useSession();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('DISPENSER');
  const [branchId, setBranchId] = useState('br-ikeja');
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [notification, setNotification] = useState('');

  if (!canManageUsers || !currentUser) return null;

  const handleAddOrEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    if (editingUserId) {
      // Modify existing user
      updateUser({
        id: editingUserId,
        name,
        email,
        role,
        branchId: role === 'SUPER_ADMIN' || role === 'REGIONAL_MANAGER' ? undefined : branchId,
        assignedRegionIds: role === 'REGIONAL_MANAGER' ? ['reg-lagos'] : undefined
      });
      setNotification(`Successfully modified user: ${name}`);
      setEditingUserId(null);
    } else {
      // Create new user
      createUser({
        name,
        email,
        role,
        branchId: role === 'SUPER_ADMIN' || role === 'REGIONAL_MANAGER' ? undefined : branchId,
        assignedRegionIds: role === 'REGIONAL_MANAGER' ? ['reg-lagos'] : undefined
      });
      setNotification(`Successfully registered new user: ${name}`);
    }

    // Reset Form
    setName('');
    setEmail('');
    setRole('DISPENSER');
    setBranchId('br-ikeja');

    setTimeout(() => setNotification(''), 3000);
  };

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setBranchId(user.branchId || 'br-ikeja');
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    deleteUser(userId);
    setNotification(`Successfully deleted user: ${user.name}`);
    setTimeout(() => setNotification(''), 3000);
  };

  const roleOptions = [
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
    { value: 'ADMIN', label: 'Branch Admin' },
    { value: 'PHARMACIST', label: 'Pharmacist' },
    { value: 'DISPENSER', label: 'Dispenser' }
  ];

  const branchOptions = MOCK_BRANCHES.map(b => ({
    value: b.id,
    label: `${b.name} (${b.code})`
  }));

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border/20 pb-4">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-bold uppercase tracking-wider text-foreground">
            User Governance & Management
          </CardTitle>
          <Badge variant="success">Active Panel</Badge>
        </div>
        <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
          Access Granted: {currentUser.role.replace('_', ' ')} Privilege
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 grid gap-6 lg:grid-cols-3">
        
        {/* Form panel */}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground mb-1">Security Role</label>
                <Select
                  value={role}
                  onChange={(val) => setRole(val as UserRole)}
                  options={roleOptions}
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

            {notification && (
              <div className="flex items-center gap-1.5 p-2 rounded bg-success/15 border border-success/20 text-xxs text-success font-medium">
                <Check className="h-3.5 w-3.5" />
                <span>{notification}</span>
              </div>
            )}

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

        {/* User list table */}
        <div className="lg:col-span-2">
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
                     MOCK_BRANCHES.find(b => b.id === u.branchId)?.name || 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="ghost" 
                        className="h-7 text-xxs hover:text-primary"
                        onClick={() => handleEditClick(u)}
                      >
                        Modify
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="h-7 text-xxs text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteUser(u.id)}
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

      </CardContent>
    </Card>
  );
};
