import { useState } from "react";
import { LayoutDashboard, Activity, History, BrainCircuit, LogOut, Settings, HeartPulse, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ViewType } from "../../types";
import { cn } from "../../lib/utils";

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
}

export default function Sidebar({ currentView, onViewChange, onSignOut, onOpenSettings }: SidebarProps) {
  const [isEasterEggOpen, setIsEasterEggOpen] = useState(false);

  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'measure', icon: Activity, label: 'Measure' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'ai', icon: BrainCircuit, label: 'AI Analysis' },
  ];

  return (
    <>
      <motion.div
        className="w-20 h-screen fixed left-0 top-0 flex flex-col items-center py-8 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50"
        animate={isEasterEggOpen ? { x: [0, -2, 2, -2, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="mb-10"
          animate={isEasterEggOpen ? { rotate: [0, -8, 8, -4, 0] } : { rotate: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button
            type="button"
            onClick={() => setIsEasterEggOpen(true)}
            className="w-10 h-10 bg-brand-indigo rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-indigo/20 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            aria-label="MediBot"
          >
            <HeartPulse size={24} className="animate-heartbeat" />
          </button>
        </motion.div>

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

        <motion.div
          className="flex flex-col gap-2 mb-4"
          animate={isEasterEggOpen ? { y: [0, 4, -4, 2, 0] } : { y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <button onClick={onOpenSettings} className="w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group relative">
            <Settings size={22} />
            <span className="absolute left-16 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-bold tracking-wider uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60]">
              Settings
            </span>
          </button>
          <button onClick={onSignOut} className="w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all group relative">
            <LogOut size={22} />
            <span className="absolute left-16 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-bold tracking-wider uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60]">
              Sign Out
            </span>
          </button>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isEasterEggOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsEasterEggOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.85, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className="relative bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-indigo-100 dark:border-indigo-900/40 text-center overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-indigo/10 rounded-full blur-2xl pointer-events-none" />
              <motion.div
                className="absolute -bottom-8 -left-8 w-28 h-28 bg-rose-400/10 rounded-full blur-2xl pointer-events-none"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              />

              <button
                type="button"
                onClick={() => setIsEasterEggOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <motion.div
                className="w-16 h-16 mx-auto mb-5 bg-brand-indigo rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-indigo/30"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              >
                <HeartPulse size={32} />
              </motion.div>

              <motion.p
                className="text-2xl font-display font-bold text-slate-800 dark:text-white mb-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                MediBot says hell
                <span className="text-brand-indigo">o!</span>
              </motion.p>
              <motion.p
                className="text-sm text-slate-500 dark:text-slate-400 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Beep boop. Your vitals are loved.
              </motion.p>

              <motion.button
                type="button"
                onClick={() => setIsEasterEggOpen(false)}
                className="w-full py-3.5 bg-brand-indigo text-white rounded-2xl font-bold shadow-lg shadow-brand-indigo/25 hover:bg-brand-indigo-hover transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Say hello!
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
