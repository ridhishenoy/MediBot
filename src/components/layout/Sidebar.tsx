import { LayoutDashboard, Activity, History, BrainCircuit, LogOut, Settings } from "lucide-react";
import { ViewType } from "../../types";
import { cn } from "../../lib/utils";

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'measure', icon: Activity, label: 'Measure' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'ai', icon: BrainCircuit, label: 'AI Analysis' },
  ];

  return (
    <div className="w-20 h-screen fixed left-0 top-0 flex flex-col items-center py-8 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50">
      <div className="mb-10">
        <div className="w-10 h-10 bg-brand-indigo rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-indigo/20">
          M
        </div>
      </div>
      
      <nav className="flex-1 flex flex-col gap-6">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as ViewType)}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative",
              currentView === item.id 
                ? "bg-indigo-50 dark:bg-brand-indigo/10 text-brand-indigo shadow-sm" 
                : "text-slate-400 hover:text-brand-indigo hover:bg-indigo-50/50 dark:hover:bg-slate-800"
            )}
            title={item.label}
          >
            <item.icon size={22} className={cn(currentView === item.id ? "stroke-[2.5]" : "stroke-[2]")} />
            <span className="absolute left-16 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-bold tracking-wider uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60]">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-6 mb-4">
        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <Settings size={22} />
        </button>
        <button className="text-slate-400 hover:text-rose-500 transition-colors">
          <LogOut size={22} />
        </button>
      </div>
    </div>
  );
}
