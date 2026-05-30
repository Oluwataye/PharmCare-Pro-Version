import React from 'react';
import { useStaffUseCase } from '../../application/use-cases/useStaffUseCase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableEmpty } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Search, Clock } from 'lucide-react';

export const ActiveStaffMonitor: React.FC = () => {
  const {
    staff,
    totalCount,
    activeStaffInScope,
    globalOnlineCount,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages
  } = useStaffUseCase();

  // Helper to format shift duration
  const getShiftDuration = (startedAt?: string) => {
    if (!startedAt) return 'N/A';
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const diffMs = now - start;
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHrs}h ${diffMins}m`;
  };

  const getStatusBadge = (status: 'online' | 'offline' | 'on_break') => {
    switch (status) {
      case 'online':
        return <Badge variant="success" pulse>Online</Badge>;
      case 'on_break':
        return <Badge variant="warning" pulse>On Break</Badge>;
      case 'offline':
      default:
        return <Badge variant="secondary">Offline</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge variant="destructive">Super Admin</Badge>;
      case 'REGIONAL_MANAGER':
        return <Badge variant="info">Regional Mgr</Badge>;
      case 'ADMIN':
        return <Badge variant="primary">Branch Admin</Badge>;
      case 'PHARMACIST':
        return <Badge variant="outline" className="border-indigo-400 text-indigo-400">Pharmacist</Badge>;
      case 'DISPENSER':
      default:
        return <Badge variant="secondary">Dispenser</Badge>;
    }
  };

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border/20 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold uppercase tracking-wider text-foreground">
              Staff Shift Monitor
            </CardTitle>
            <Badge variant="primary">
              {activeStaffInScope} Scoped Session{activeStaffInScope !== 1 && 's'}
            </Badge>
          </div>
          <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
            Concurrency tracker ({globalOnlineCount} active staff globally)
          </CardDescription>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search staff, role or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned Branch</TableHead>
              <TableHead>Geographic Region</TableHead>
              <TableHead>Connection Status</TableHead>
              <TableHead>Shift Timer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium text-slate-800 text-xs sm:text-sm">{member.name}</TableCell>
                <TableCell>{getRoleBadge(member.role)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{member.branchName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{member.regionName}</TableCell>
                <TableCell>{getStatusBadge(member.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {member.status !== 'offline' ? (
                    <span className="flex items-center gap-1.5 text-xs text-indigo-500 font-semibold">
                      <Clock className="h-3.5 w-3.5 text-indigo-600 animate-pulse-slow" />
                      {getShiftDuration(member.shiftStartedAt)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60 italic">Shift Ended</span>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {totalCount === 0 && (
              <TableEmpty 
                columnsCount={6} 
                message="No active staff sessions matching criteria" 
                description="No users are currently logged in under this region or branch scope."
              />
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {totalCount > 8 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/20">
            <span className="text-xxs uppercase tracking-wider text-muted-foreground font-semibold">
              Page {currentPage} of {totalPages} ({totalCount} staff members total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export { useStaffUseCase };
