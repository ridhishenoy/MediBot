import { Search, Bell, Sun, Moon, Bluetooth, Plus, UserPlus, Users } from "lucide-react";
import { UserProfile } from "../../types";
import { cn } from "../../lib/utils";

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isConnecting: boolean;
  isConnected: boolean;
  onConnect: () => void;
  onManualData: () => void;
  onNewProfile: () => void;
  currentUser: UserProfile | null;
  users: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
}

export default function Navbar({ 
  darkMode, setDarkMode, isConnecting, isConnected, onConnect, 
  onManualData, onNewProfile, currentUser, users, onSwitchUser 
}: NavbarProps) {
  return (
    <div className="h-16 flex items-center justify-between px-6 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white font-display">MediBot Dashboard</h1>
        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
          System Live
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onConnect}
          disabled={isConnecting || isConnected}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm",
            isConnected 
              ? "bg-emerald-500 text-white cursor-default" 
              : isConnecting 
                ? "bg-brand-indigo text-white animate-pulse" 
                : "bg-brand-indigo text-white hover:bg-brand-indigo-hover"
          )}
        >
          <Bluetooth size={16} />
          <span>{isConnected ? "Connected" : isConnecting ? "Connecting..." : "Connect"}</span>
        </button>

        <button 
          onClick={onManualData}
          className="px-4 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        >
          Manual Input
        </button>

        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all font-bold"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative group">
          <button className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-100 dark:border-slate-700">
              <img 
                src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name || 'default'}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden md:block">{currentUser?.name || "User"}</span>
            <Search size={14} className="text-slate-400" />
          </button>
          
          <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="p-3 border-bottom border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Profiles</p>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto scrollbar-hide">
                {users.map(user => (
                  <button 
                    key={user.userId} 
                    onClick={() => onSwitchUser(user)}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-all",
                      currentUser?.userId === user.userId ? "bg-indigo-50 dark:bg-brand-indigo/10 text-brand-indigo" : "hover:bg-slate-50 dark:hover:bg-slate-700"
                    )}
                  >
                    <img 
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                      alt={user.name} 
                      className="w-7 h-7 rounded-full"
                    />
                    <span className="text-sm font-medium">{user.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2 border-t border-slate-200 dark:border-slate-700">
              <button 
                onClick={onNewProfile}
                className="w-full flex items-center gap-2 p-2 rounded-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-700 text-brand-indigo font-bold text-xs"
              >
                <UserPlus size={16} />
                <span>NEW PROFILE</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
