import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { StaffMember } from '../../domain/entities/models';
import { MockStaffRepository } from '../../data/mock/staffRepo';

const staffRepo = new MockStaffRepository();

export const useStaffUseCase = () => {
  const { selectedRegionId, selectedOutletId, isSyncing } = useSession();
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 8;

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await staffRepo.getStaff();
      setStaff(data);
    } catch (err) {
      console.error("Failed to load staff list:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Scramble staff statuses to simulate live active logins
  const scrambleStatuses = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeStaff = await staffRepo.getStaff();
      await Promise.all(
        activeStaff.map(s => {
          if (Math.random() > 0.8) {
            const statuses: StaffMember['status'][] = ['online', 'offline', 'on_break'];
            const nextStatus = statuses[Math.floor(Math.random() * statuses.length)];
            return staffRepo.updateStaffStatus(s.id, nextStatus);
          }
          return Promise.resolve(s);
        })
      );
      await fetchStaff();
    } catch (err) {
      console.error("Failed to scramble staff states:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchStaff]);

  // Filter staff based on active location scope
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      // Branch scope check
      if (selectedOutletId !== 'all' && s.branchId !== selectedOutletId) {
        return false;
      }
      // Region scope check
      if (selectedRegionId !== 'all' && s.regionId !== selectedRegionId) {
        return false;
      }
      // Search matching
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(query) ||
          s.role.toLowerCase().includes(query) ||
          s.branchName.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [staff, selectedRegionId, selectedOutletId, searchQuery]);

  // Pagination split
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage) || 1;
  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStaff.slice(start, start + itemsPerPage);
  }, [filteredStaff, currentPage]);

  const globalOnlineCount = useMemo(() => {
    return staff.filter(s => s.status === 'online').length;
  }, [staff]);

  const activeStaffInScope = useMemo(() => {
    return filteredStaff.filter(s => s.status === 'online' || s.status === 'on_break').length;
  }, [filteredStaff]);

  return {
    staff: paginatedStaff,
    totalCount: filteredStaff.length,
    activeStaffInScope,
    globalOnlineCount,
    searchQuery,
    setSearchQuery: (q: string) => { setSearchQuery(q); setCurrentPage(1); },
    currentPage,
    setCurrentPage,
    totalPages,
    isLoading: isLoading || isSyncing,
    refetch: fetchStaff,
    scrambleStatuses
  };
};
