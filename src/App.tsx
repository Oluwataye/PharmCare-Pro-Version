import React, { useState } from 'react';
import { useSession } from './application/context/SessionContext';
import { useInventoryUseCase } from './application/use-cases/useInventoryUseCase';

import { AuthPage } from './components/multi-outlet/AuthPage';
import { Sidebar, ActivePanel } from './components/layout/Sidebar';
import { OutletSelector } from './components/multi-outlet/OutletSelector';
import { OverviewPanel } from './components/multi-outlet/OverviewPanel';
import { InventoryPanel } from './components/multi-outlet/InventoryPanel';
import { LogisticsPanel } from './components/multi-outlet/LogisticsPanel';
import { SalesCashPanel } from './components/multi-outlet/SalesCashPanel';
import { UserManagementPanel } from './components/multi-outlet/UserManagementPanel';

import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { Shield, RotateCw, LogOut, Menu } from 'lucide-react';

const App: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    logout,
    isSyncing
  } = useSession();

  const { refetch: refetchInventory } = useInventoryUseCase();

  // Navigation Panel State
  const [activePanel, setActivePanel] = useState<ActivePanel>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (!isAuthenticated || !currentUser) {
    return <AuthPage />;
  }

  const handleRefreshAll = () => {
    refetchInventory();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans select-none custom-scrollbar relative">
      
      {/* 1. Responsive Sidebar Navigation */}
      <Sidebar
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Sticky Global Top Header */}
        <header className="border-b border-border/80 bg-card shadow-sm sticky top-0 z-40 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Hamburger trigger for mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-muted-foreground shrink-0"
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-800 uppercase tracking-wider hidden sm:block">
                  PharmCare Pro Enterprise
                </h1>
                <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 uppercase font-mono text-[9px] py-0 px-1.5">
                  v2.1-ProdUI
                </Badge>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:block mt-0.5">
                Pharmaceutical Governance Hub
              </p>
            </div>
          </div>

          {/* Secure User details & Logout actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-slate-100/50 text-[10px] text-muted-foreground uppercase font-semibold">
              <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="hidden xs:inline">User:</span>
              <span className="text-slate-800 font-bold max-w-[100px] truncate">{currentUser.name.split(' (')[0]}</span>
              <Badge variant={currentUser.role === 'SUPER_ADMIN' ? 'destructive' : currentUser.role === 'REGIONAL_MANAGER' ? 'info' : 'primary'} className="text-[7.5px] tracking-wider py-0 px-1 font-mono uppercase scale-95 shrink-0 select-none">
                {currentUser.role.replace('_', ' ')}
              </Badge>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout} 
              className="gap-1.5 h-8 text-[10px] uppercase tracking-wider text-destructive hover:bg-destructive/10 border-destructive/20 bg-card"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Log Out</span>
            </Button>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefreshAll} 
              disabled={isSyncing}
              className="flex-shrink-0 bg-card border-border h-8 w-8"
              aria-label="Refresh live data feeds"
            >
              <RotateCw className={`h-4 w-4 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>

        {/* Global Location Selector bar & Panel content viewport */}
        <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Outlet Scoping switches */}
          <OutletSelector />

          {/* Render active workspace panel */}
          <div className="min-h-[500px]">
            {activePanel === 'overview' && <OverviewPanel />}
            {activePanel === 'inventory' && <InventoryPanel />}
            {activePanel === 'transfers' && <LogisticsPanel onInventoryMutated={refetchInventory} />}
            {activePanel === 'sales' && <SalesCashPanel onInventoryMutated={refetchInventory} />}
            {activePanel === 'governance' && <UserManagementPanel />}
          </div>

        </main>

        {/* Footer */}
        <footer className="border-t border-border/80 py-5 px-6 bg-card text-center flex flex-col sm:flex-row items-center justify-between gap-3 text-xxs uppercase tracking-wider text-muted-foreground font-medium shadow-inner mt-12">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-border bg-card">Offline Sync Hub</Badge>
            <span>All nodes linked & encrypted</span>
          </div>
          <p>© 2026 T-Tech PharmCare Group. All rights reserved.</p>
        </footer>

      </div>

    </div>
  );
};

export default App;
