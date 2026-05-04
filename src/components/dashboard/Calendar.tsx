import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { useState } from "react";
import { cn } from "../../lib/utils";

interface CalendarProps {
  measurements: { timestamp: string }[];
}

export default function Calendar({ measurements }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold font-display">{format(currentDate, 'MMMM yyyy')}</h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-slate-400 mb-2">{day}</div>
        ))}
        
        {/* Placeholder for days offset */}
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="h-12"></div>
        ))}
        {days.map(day => {
          const dayMeasurements = measurements.filter(m => isSameDay(new Date(m.timestamp), day));
          const hasMeasurements = dayMeasurements.length > 0;
          
          return (
            <div key={day.toString()} className="flex flex-col items-center gap-1 h-12">
              <div className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium",
                isSameDay(day, new Date()) ? "bg-brand-blue text-white" : "hover:bg-slate-50 dark:hover:bg-slate-800"
              )}>
                {format(day, 'd')}
              </div>
              <div className="flex gap-0.5 mt-0.5">
                {dayMeasurements.slice(0, 3).map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-brand-blue rounded-full"></div>
                ))}
                {dayMeasurements.length > 3 && <div className="text-[6px] text-brand-blue">+</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
