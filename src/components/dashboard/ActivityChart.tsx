import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VitalMeasurement } from '../../types';
import { format } from 'date-fns';

interface ActivityChartProps {
  data: VitalMeasurement[];
}

export default function ActivityChart({ data }: ActivityChartProps) {
  const chartData = data.slice(-10).map(m => ({
    time: format(new Date(m.timestamp), 'HH:mm'),
    hr: m.heartRate,
    spo2: m.spo2,
    temp: m.temperature,
    stressScore: m.stress === 'High' ? 80 : m.stress === 'Mod' ? 50 : 20,
  }));

  return (
    <div className="w-full h-80">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-display font-bold">Activity</h3>
        <div className="flex gap-2">
          {['Weekly', 'Monthly', 'Yearly'].map(tab => (
            <button key={tab} className={tab === 'Monthly' ? "px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium" : "px-4 py-2 text-slate-400 text-sm font-medium"}>
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSpo2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
          />
          <Area 
            type="monotone" 
            dataKey="hr" 
            stroke="#f43f5e" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorHr)" 
          />
          <Area 
            type="monotone" 
            dataKey="spo2" 
            stroke="#3b82f6" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorSpo2)" 
          />
          <Area 
            type="monotone" 
            dataKey="temp" 
            stroke="#f59e0b" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorTemp)" 
          />
          <Area 
            type="monotone" 
            dataKey="stressScore" 
            stroke="#6366f1" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorStress)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
