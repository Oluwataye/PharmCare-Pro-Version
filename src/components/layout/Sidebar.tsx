import React from 'react';
import { useSession } from '../../application/context/SessionContext';
import { 
  LayoutDashboard, Database, ArrowRightLeft, 
  DollarSign, UserCog, X, ChevronLeft, ChevronRight 
} from 'lucide-react';

export type ActivePanel = 'overview' | 'inventory' | 'transfers' | 'sales' | 'governance';

interface SidebarProps {
  activePanel: ActivePanel;
  onPanelChange: (panel: ActivePanel) => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePanel,
  onPanelChange,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const { canManageUsers } = useSession();

  const navigationItems = [
    { id: 'overview' as ActivePanel, label: 'Overview', icon: LayoutDashboard },
    { id: 'inventory' as ActivePanel, label: 'Inventory Catalog', icon: Database },
    { id: 'transfers' as ActivePanel, label: 'Logistics Transfers', icon: ArrowRightLeft },
    { id: 'sales' as ActivePanel, label: 'Sales & Ops', icon: DollarSign },
    ...(canManageUsers ? [{ id: 'governance' as ActivePanel, label: 'Governance', icon: UserCog }] : [])
  ];

  const handleNavClick = (id: ActivePanel) => {
    onPanelChange(id);
    setIsMobileOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-card border-r border-border/80 select-none">
      
      {/* Brand area */}
      <div className={`p-4 border-b border-border/50 flex items-center justify-between gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/10">
            <span className="text-base text-white">🏥</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-extrabold text-xs text-slate-900 tracking-tight block">PharmCare Pro</span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Enterprise Hub</span>
            </div>
          )}
        </div>
        
        {/* Toggle mobile sidebar */}
        <button 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-1 rounded-lg hover:bg-slate-100 text-muted-foreground"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation menu list */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xxs font-semibold uppercase tracking-wider transition-all duration-200 relative group ${
                isActive 
                  ? 'bg-primary/5 text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-slate-50'
              }`}
              aria-label={`Go to ${item.label}`}
            >
              {/* Highlight active indicator */}
              {isActive && (
                <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r bg-primary" />
              )}
              
              <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground'}`} />
              
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
              
              {/* Tooltip on collapsed state */}
              {isCollapsed && (
                <span className="absolute left-14 bg-slate-900 text-white text-[9px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition duration-150 shadow-md z-50">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapsible Trigger footer */}
      <div className="p-3 border-t border-border/50 hidden md:block">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg border border-border hover:bg-slate-50 text-muted-foreground transition duration-200"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4.5 w-4.5" /> : (
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
              <ChevronLeft className="h-4.5 w-4.5" />
              <span>Collapse</span>
            </div>
          )}
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop view */}
      <aside className={`hidden md:block h-screen sticky top-0 shrink-0 transition-all duration-300 z-30 ${isCollapsed ? 'w-16' : 'w-56'}`}>
        {navContent}
      </aside>

      {/* Mobile drawer view */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/40 backdrop-blur-xxs">
          <div className="w-56 h-full shrink-0 animate-in slide-in-from-left duration-250">
            {navContent}
          </div>
          <div className="flex-1" onClick={() => setIsMobileOpen(false)} />
        </div>
      )}
    </>
  );
};
