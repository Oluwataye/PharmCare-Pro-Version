import { IStaffRepository } from '../interfaces/repositories';
import { StaffMember } from '../../domain/entities/models';
import { generateMockStaff } from './mockData';

let _staffDb: StaffMember[] = [];

export class MockStaffRepository implements IStaffRepository {
  constructor() {
    if (_staffDb.length === 0) {
      _staffDb = generateMockStaff();
    }
  }

  async getStaff(branchId?: string, regionId?: string): Promise<StaffMember[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    let filtered = _staffDb;
    
    if (branchId && branchId !== 'all') {
      filtered = filtered.filter(s => s.branchId === branchId);
    } else if (regionId && regionId !== 'all') {
      filtered = filtered.filter(s => s.regionId === regionId);
    }
    
    return filtered;
  }

  async updateStaffStatus(id: string, status: StaffMember['status']): Promise<StaffMember> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const idx = _staffDb.findIndex(s => s.id === id);
    if (idx < 0) throw new Error("Staff member not found");

    const updated: StaffMember = {
      ..._staffDb[idx],
      status,
      shiftStartedAt: status !== 'offline' ? (_staffDb[idx].shiftStartedAt || new Date().toISOString()) : undefined,
      lastActiveAt: new Date().toISOString()
    };
    
    _staffDb = _staffDb.map(s => s.id === id ? updated : s);
    return updated;
  }
}
export { _staffDb };
