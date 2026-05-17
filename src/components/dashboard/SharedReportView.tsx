import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { HeartPulse, Stethoscope, Droplets, Thermometer, Activity, Calendar, History, ListFilter, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../lib/firebase';
import { SharedReport } from '../../types';
import ActivityChart from './ActivityChart';
import { cn } from '../../lib/utils';

interface SharedReportViewProps {
  reportId: string;
}

export default function SharedReportView({ reportId }: SharedReportViewProps) {
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [historyFilter, setHistoryFilter] = useState<'all' | 'week' | 'month' | 'year' | 'manual'>('all');
  const [manualRange, setManualRange] = useState({ from: '', to: '' });
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const docRef = doc(db, 'shared_reports', reportId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setReport(docSnap.data() as SharedReport);
        } else {
          setError('Report not found or has expired.');
        }
      } catch (err) {
        console.error("Error fetching report:", err);
        setError('Could not load report. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportId]);

  const filteredMeasurements = useMemo(() => {
    if (!report) return [];
    const now = new Date();
    let filtered = [...report.measurements];

    if (historyFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(m => new Date(m.timestamp) >= oneWeekAgo);
    } else if (historyFilter === 'month') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(m => new Date(m.timestamp) >= thirtyDaysAgo);
    } else if (historyFilter === 'year') {
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(m => new Date(m.timestamp) >= oneYearAgo);
    } else if (historyFilter === 'manual' && manualRange.from && manualRange.to) {
      const fromDate = new Date(manualRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(manualRange.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(m => {
        const d = new Date(m.timestamp);
        return d >= fromDate && d <= toDate;
      });
    }

    return filtered;
  }, [report, historyFilter, manualRange]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-800 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="font-bold uppercase tracking-widest text-sm">Loading Patient Report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl max-w-md w-full text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
            <Activity size={32} />
          </div>
          <h2 className="text-2xl font-display font-bold">Invalid Link</h2>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-500 shadow-inner">
              <img src={report.patientAvatar} alt={report.patientName} className="w-16 h-16 rounded-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-1">{report.patientName}</h1>
              <div className="flex items-center gap-4 text-sm font-bold text-slate-400 uppercase tracking-wider">
                <span>Patient Vitals Report</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                <span>Generated {new Date(report.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Age/Sex</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{report.patientAge || '--'} / {report.patientSex || '--'}</span>
            </div>
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Blood</span>
              <span className="text-sm font-bold text-red-500">{report.patientBloodGroup || '--'}</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="h-[400px]">
            <ActivityChart data={filteredMeasurements} />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <History className="text-indigo-500" size={24} />
              <h3 className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">Measurement History</h3>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-bold text-sm text-slate-700 dark:text-slate-200"
              >
                <ListFilter size={18} className="text-brand-indigo" />
                <span>Filter: {historyFilter === 'all' ? 'All Time' : historyFilter === 'week' ? 'Last 1 Week' : historyFilter === 'month' ? 'Last 30 Days' : historyFilter === 'year' ? 'Last Year' : 'Manual'}</span>
                <ChevronDown size={16} className={cn("transition-transform", isFilterDropdownOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isFilterDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsFilterDropdownOpen(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-20"
                    >
                      {[
                        { id: 'all', label: 'All Time' },
                        { id: 'week', label: 'Last 1 Week' },
                        { id: 'month', label: 'Last 30 Days' },
                        { id: 'year', label: 'Last Year' },
                        { id: 'manual', label: 'Manual Range' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setHistoryFilter(opt.id as any);
                            if (opt.id !== 'manual') setIsFilterDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between",
                            historyFilter === opt.id ? "bg-indigo-50 dark:bg-brand-indigo/10 text-brand-indigo" : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                          )}
                        >
                          {opt.label}
                          {historyFilter === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-brand-indigo" />}
                        </button>
                      ))}

                      {historyFilter === 'manual' && (
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">From Date</label>
                            <div className="relative">
                              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                              <input
                                type="date"
                                value={manualRange.from}
                                onChange={(e) => setManualRange(prev => ({ ...prev, from: e.target.value }))}
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-indigo/30 outline-none"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">To Date</label>
                            <div className="relative">
                              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                              <input
                                type="date"
                                value={manualRange.to}
                                onChange={(e) => setManualRange(prev => ({ ...prev, to: e.target.value }))}
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-indigo/30 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">Date & Time</th>
                  <th className="px-6 py-4">Heart Rate</th>
                  <th className="px-6 py-4">SpO2</th>
                  <th className="px-6 py-4">Temperature</th>
                  <th className="px-6 py-4 rounded-tr-xl">Stress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredMeasurements.slice().reverse().map((m) => (
                  <tr key={m.id || m.timestamp} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{new Date(m.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-100">{m.heartRate} <span className="text-xs text-slate-400 font-normal">BPM</span></td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-100">{m.spo2} <span className="text-xs text-slate-400 font-normal">%</span></td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-100">{m.temperature} <span className="text-xs text-slate-400 font-normal">°C</span></td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        m.stress === 'Low' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          m.stress === 'Mod' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}>
                        {m.stress}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
