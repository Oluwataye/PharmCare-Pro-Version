import React, { useMemo, useState } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { MOCK_REGIONS, generateMockSalesReports } from '../../data/mock/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { formatNaira } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Globe, MapPin, Milestone } from 'lucide-react';

export const RegionalDistribution: React.FC = () => {
  const { branches } = useSession();
  const regions = MOCK_REGIONS;
  const salesReports = useMemo(() => generateMockSalesReports(), []);
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);

  // Compute aggregated stats for each region
  const regionalStats = useMemo(() => {
    return regions.map(reg => {
      const regionBranches = branches.filter(b => b.regionId === reg.id);
      const branchIds = regionBranches.map(b => b.id);
      
      const regionReports = salesReports.filter(r => branchIds.includes(r.branchId));
      
      const totalSales = regionReports.reduce((sum, r) => sum + r.totalSales, 0);
      const totalTx = regionReports.reduce((sum, r) => sum + r.transactionCount, 0);
      
      return {
        id: reg.id,
        name: reg.name,
        branchCount: regionBranches.length,
        totalSales,
        totalTx,
        office: reg.headOfficeAddress || 'N/A'
      };
    });
  }, [regions, branches, salesReports]);

  const grandTotalSales = useMemo(() => {
    return regionalStats.reduce((sum, r) => sum + r.totalSales, 0);
  }, [regionalStats]);

  // SVG coordinate details for mock region nodes
  const mapNodes = [
    { id: 'reg-lagos', label: 'Lagos', cx: 80, cy: 190, r: 24, fill: 'rgba(99, 102, 241, 0.45)', hoverFill: 'rgba(99, 102, 241, 0.85)', stroke: '#6366f1' },
    { id: 'reg-west', label: 'Western', cx: 100, cy: 110, r: 28, fill: 'rgba(168, 85, 247, 0.45)', hoverFill: 'rgba(168, 85, 247, 0.85)', stroke: '#a855f7' },
    { id: 'reg-north', label: 'Northern', cx: 220, cy: 90, r: 35, fill: 'rgba(14, 165, 233, 0.45)', hoverFill: 'rgba(14, 165, 233, 0.85)', stroke: '#0ea5e9' },
    { id: 'reg-east', label: 'Eastern', cx: 200, cy: 180, r: 30, fill: 'rgba(16, 185, 129, 0.45)', hoverFill: 'rgba(16, 185, 129, 0.85)', stroke: '#10b981' }
  ];

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="pb-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-bold uppercase tracking-wider text-foreground">
            Regional Sales Distribution
          </CardTitle>
        </div>
        <CardDescription className="text-xxs uppercase tracking-widest text-muted-foreground mt-0.5">
          National outlet footprint analysis
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6 grid gap-6 md:grid-cols-2 items-center">
        
        {/* Interactive SVG Visual Map */}
        <div className="relative flex justify-center bg-slate-50 border border-border rounded-xl p-4 overflow-hidden">
          <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
            <Milestone className="h-3.5 w-3.5 text-primary" />
            <span>Interactive Node Matrix</span>
          </div>
          
          <svg viewBox="0 0 320 240" className="w-full max-w-[280px] h-auto">
            {/* Grid background lines */}
            <line x1="0" y1="60" x2="320" y2="60" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
            <line x1="0" y1="120" x2="320" y2="120" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
            <line x1="0" y1="180" x2="320" y2="180" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
            <line x1="80" y1="0" x2="80" y2="240" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
            <line x1="160" y1="0" x2="160" y2="240" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
            <line x1="240" y1="0" x2="240" y2="240" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />

            {/* Connection mesh lines */}
            <path 
              d="M 80 190 L 100 110 M 100 110 L 220 90 M 220 90 L 200 180 M 200 180 L 80 190" 
              stroke="rgba(0,0,0,0.08)" 
              strokeWidth="2" 
              strokeDasharray="4 4"
            />

            {/* Regional interactive bubbles */}
            {mapNodes.map((n) => {
              const isHovered = hoveredRegionId === n.id;
              const stats = regionalStats.find(r => r.id === n.id);
              const percentage = grandTotalSales > 0 ? ((stats?.totalSales || 0) / grandTotalSales * 100).toFixed(0) : '0';
              
              return (
                <g 
                  key={n.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredRegionId(n.id)}
                  onMouseLeave={() => setHoveredRegionId(null)}
                >
                  <circle
                    cx={n.cx}
                    cy={n.cy}
                    r={isHovered ? n.r + 4 : n.r}
                    fill={isHovered ? n.hoverFill : n.fill}
                    stroke={n.stroke}
                    strokeWidth={isHovered ? 3 : 1.5}
                    className="transition-all duration-300"
                  />
                  <text
                    x={n.cx}
                    y={n.cy - 2}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    className="pointer-events-none select-none font-sans"
                  >
                    {n.label}
                  </text>
                  <text
                    x={n.cx}
                    y={n.cy + 10}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.8)"
                    fontSize="8"
                    className="pointer-events-none select-none font-mono"
                  >
                    {percentage}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Region Breakdown List */}
        <div className="space-y-3.5">
          {regionalStats.map((stats) => {
            const isHighlighted = hoveredRegionId === stats.id;
            const contributionPct = grandTotalSales > 0 ? (stats.totalSales / grandTotalSales * 100) : 0;
            
            return (
              <div 
                key={stats.id}
                onMouseEnter={() => setHoveredRegionId(stats.id)}
                onMouseLeave={() => setHoveredRegionId(null)}
                className={`p-3 rounded-lg border transition-all duration-200 flex items-center justify-between ${
                  isHighlighted 
                    ? 'bg-primary/5 border-primary shadow-sm translate-x-1' 
                    : 'bg-card border-border hover:border-primary/20'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{stats.name}</span>
                    <Badge variant="primary" className="font-mono text-[9px] px-1 py-0">{stats.branchCount} Outlets</Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground truncate">
                    <MapPin className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
                    <span className="truncate">{stats.office}</span>
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <span className="block text-xs font-bold text-foreground font-mono">{formatNaira(stats.totalSales)}</span>
                  <span className="text-xxs text-muted-foreground uppercase tracking-wider font-semibold">
                    {contributionPct.toFixed(1)}% Contribution
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </CardContent>
    </Card>
  );
};
