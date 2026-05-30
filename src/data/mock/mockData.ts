import { Region, Branch, InventoryItem, StaffMember, SalesReportEntry, UserRole } from '../../domain/entities/models';

export const MOCK_REGIONS: Region[] = [
  { id: 'reg-lagos', name: 'Lagos Zone', headOfficeAddress: '12 Medical Rd, Ikeja, Lagos', isActive: true },
  { id: 'reg-west', name: 'Western Region', headOfficeAddress: '45 Ring Road, Ibadan, Oyo', isActive: true },
  { id: 'reg-north', name: 'Northern Region', headOfficeAddress: '88 Aminu Kano Crescent, Wuse II, Abuja', isActive: true },
  { id: 'reg-east', name: 'Eastern Region', headOfficeAddress: '10 Okpara Ave, Enugu', isActive: true }
];

export const MOCK_BRANCHES: Branch[] = [
  { id: 'br-warehouse', name: 'Central Distribution Warehouse', code: 'LAG-WHSE', regionId: 'reg-lagos', location: 'Ikeja, Lagos', type: 'warehouse', isActive: true },
  { id: 'br-ikeja', name: 'Ikeja Outlet', code: 'LAG-IKEJ', regionId: 'reg-lagos', location: 'Ikeja Mall, Lagos', type: 'retail', isActive: true },
  { id: 'br-lekki', name: 'Lekki Phase 1 Outlet', code: 'LAG-LEKK', regionId: 'reg-lagos', location: 'Admiralty Way, Lekki', type: 'retail', isActive: true },
  { id: 'br-ibadan', name: 'Ibadan Main Outlet', code: 'WST-IBAD', regionId: 'reg-west', location: 'Ring Road, Ibadan', type: 'retail', isActive: true },
  { id: 'br-abeokuta', name: 'Abeokuta Express Outlet', code: 'WST-ABEO', regionId: 'reg-west', location: 'Kuto, Abeokuta', type: 'retail', isActive: true },
  { id: 'br-abuja-wuse', name: 'Wuse II Premium Outlet', code: 'NTH-WUSE', regionId: 'reg-north', location: 'Wuse II, Abuja', type: 'retail', isActive: true },
  { id: 'br-kano', name: 'Kano Commercial Outlet', code: 'NTH-KANO', regionId: 'reg-north', location: 'Zaria Road, Kano', type: 'retail', isActive: true },
  { id: 'br-enugu', name: 'Enugu Urban Outlet', code: 'EST-ENUG', regionId: 'reg-east', location: 'Ogui Rd, Enugu', type: 'retail', isActive: true },
  { id: 'br-port-harcourt', name: 'PH GRA Outlet', code: 'EST-PHC', regionId: 'reg-east', location: 'GRA Phase 2, Port Harcourt', type: 'retail', isActive: true }
];

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

export const generateMockInventory = (): InventoryItem[] => {
  const list: InventoryItem[] = [];
  let idCounter = 1;
  MOCK_BRANCHES.forEach(branch => {
    INITIAL_PRODUCTS.forEach(p => {
      const isWarehouse = branch.type === 'warehouse';
      const quantity = isWarehouse 
        ? Math.floor(Math.random() * 2000) + 1500 
        : Math.floor(Math.random() * 120) + 10;
      
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

export const generateMockStaff = (): StaffMember[] => {
  const staff: StaffMember[] = [];
  const roles: UserRole[] = ['ADMIN', 'PHARMACIST', 'DISPENSER'];
  const names = [
    'Chidi Egwu', 'Amina Yusuf', 'Oluwaseun Balogun', 'Ngozi Okoro', 'Emeka Nwosu',
    'Fatima Ibrahim', 'Babajide Cole', 'Blessing Johnson', 'Tunde Folawiyo', 'Chioma Nwachukwu',
    'Abubakar Bello', 'Funke Adeleke', 'Uchechi Madu', 'Kelechi Anyanwu', 'Zainab Musa',
    'Damilola Alao', 'Somtochukwu Ilona', 'Hassan Haruna', 'Yetunde Oshin', 'Obinna Okafor',
    'Halima Sani', 'Adebayo Thomas', 'Mary Easter', 'Victor Nduka', 'Bisi Akande',
    'Chinedu Okeke', 'Rukayat Shittu', 'Kabiru Mohammed', 'Precious Duke', 'Fidelis Onu',
    'Kassim Aliyu', 'Efe Omonigho', 'Lola Shonukan', 'Emmanual Ekong', 'Sadiq Abubakar',
    'Grace Daniel', 'Temitope Ajayi', 'Kingsley Udoh', 'Bilikisu Lawal', 'Ebele Uzor',
    'Nnamdi Azikiwe', 'Aisha Gidado', 'Babatunde Fashola', 'Umar Danbappa', 'Mabel Ezenwa',
    'Segun Awolowo', 'Khadijah Bello', 'Sylvester Udoh', 'Onyinyechi Nkem', 'Mustapha Gombe',
    'Nafisa Sani', 'Sunday Moses', 'Nneka Eze', 'Aliyu Shehu', 'Olanrewaju Davies'
  ];

  names.forEach((name, index) => {
    const branch = MOCK_BRANCHES[index % MOCK_BRANCHES.length];
    const region = MOCK_REGIONS.find(r => r.id === branch.regionId)!;
    const role = roles[index % roles.length];
    const isOnline = Math.random() > 0.3; 
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

export const generateMockSalesReports = (): SalesReportEntry[] => {
  const entries: SalesReportEntry[] = [];
  const today = new Date();
  
  MOCK_BRANCHES.forEach(branch => {
    const region = MOCK_REGIONS.find(r => r.id === branch.regionId)!;
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
