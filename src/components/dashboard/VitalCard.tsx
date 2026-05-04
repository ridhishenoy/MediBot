import { type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

interface VitalCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  color: "blue" | "cyan" | "pink";
  trend?: string;
}

export default function VitalCard({ title, value, unit, icon: Icon, color, trend }: VitalCardProps) {
  const textColorClasses = {
    blue: "text-vitals-hr", // Using rose for HR (matches design HTML'sローズ for HR)
    cyan: "text-vitals-spo2",
    pink: "text-vitals-temp",
  };

  const labelColorClasses = {
    blue: "text-rose-500",
    cyan: "text-blue-500",
    pink: "text-amber-500",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
      
      <div className="flex items-end justify-between font-mono">
        <span className={cn("text-3xl font-bold", labelColorClasses[color])}>
          {value}
        </span>
        <div className="flex flex-col items-end">
          {trend && (
            <span className="text-[10px] text-emerald-500 font-bold mb-1 uppercase tracking-tighter decoration-2 underline">
              {trend}
            </span>
          )}
          <span className="text-xs text-slate-400 font-bold tracking-tight">
            {unit}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
