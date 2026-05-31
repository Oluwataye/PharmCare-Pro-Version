import React from 'react';
import { ConsolidatedMetricsGrid } from './ConsolidatedMetricsGrid';
import { RegionalDistribution } from './RegionalDistribution';
import { ActiveStaffMonitor } from './ActiveStaffMonitor';

export const OverviewPanel: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Overview Dashboard Banner */}
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
          Enterprise Operations Overview
        </h2>
        <p className="text-xxs text-muted-foreground uppercase tracking-widest leading-normal">
          Real-time metrics consolidation and regional staff distribution matrix.
        </p>
      </div>

      <ConsolidatedMetricsGrid />
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RegionalDistribution />
        </div>
        <div className="lg:col-span-1">
          <ActiveStaffMonitor />
        </div>
      </div>

    </div>
  );
};
