/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs, setDoc, doc, limit, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Heart, Droplets, Thermometer, Plus, UserPlus, Users, Rocket, MoreHorizontal, ArrowRight, BrainCircuit, Activity, Bluetooth, History, Trash2, ListFilter, ChevronDown, Calendar as CalendarIcon, Check, Stethoscope, Mail, Phone, Download, Send, Copy, ExternalLink, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import VitalCard from './components/dashboard/VitalCard';
import ActivityChart from './components/dashboard/ActivityChart';
import Calendar from './components/dashboard/Calendar';
import SharedReportView from './components/dashboard/SharedReportView';

import { db, auth, signInWithGoogle } from './lib/firebase';
import { bluetoothService, MediData } from './lib/bluetooth';
import { analyzeVitals } from './lib/gemini';
import { UserProfile, VitalMeasurement, ViewType, AIAnalysis, Doctor, SharedReport } from './types';
import { cn } from './lib/utils';

export default function App() {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [measurements, setMeasurements] = useState<VitalMeasurement[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [liveData, setLiveData] = useState<Partial<VitalMeasurement> | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'week' | 'month' | 'year' | 'manual'>('all');
  const [manualRange, setManualRange] = useState({ from: '', to: '' });
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isDoctorsModalOpen, setIsDoctorsModalOpen] = useState(false);
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [selectedDoctorForEmail, setSelectedDoctorForEmail] = useState<Doctor | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const defaultDoctors: Doctor[] = [
    { id: '1', name: 'Dr. Aurelien', seed: 'Aurelien', specialty: 'Cardiology', phone: '+1234567890', email: 'aurelien@medibot.com' },
    { id: '2', name: 'Dr. Siamak', seed: 'Siamak', specialty: 'Therapist', phone: '+1234567891', email: 'siamak@medibot.com' },
    { id: '3', name: 'Dr. Angel', seed: 'Angel', specialty: 'Surgeon', phone: '+1234567892', email: 'angel@medibot.com' },
    { id: '4', name: 'Dr. Manuel', seed: 'Manuel', specialty: 'General', phone: '+1234567893', email: 'manuel@medibot.com' }
  ];

  const doctorsList = profile?.doctors?.length ? profile.doctors : defaultDoctors;


  const filteredHistory = useMemo(() => {
    const now = new Date();
    let filtered = [...measurements];

    if (historyFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(m => new Date(m.timestamp) >= oneWeekAgo);
    } else if (historyFilter === 'month') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(m => new Date(m.timestamp) >= thirtyDaysAgo);
    } else if (historyFilter === 'year') {
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(m => new Date(m.timestamp) >= oneYearAgo);
    } else if (historyFilter === 'manual') {
      if (manualRange.from) {
        const fromDate = new Date(manualRange.from);
        filtered = filtered.filter(m => new Date(m.timestamp) >= fromDate);
      }
      if (manualRange.to) {
        const toDate = new Date(manualRange.to);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(m => new Date(m.timestamp) <= toDate);
      }
    }

    return filtered.reverse();
  }, [measurements, historyFilter, manualRange]);

  // Save selected profile to localStorage
  useEffect(() => {
    if (profile) {
      localStorage.setItem('lastSelectedUserId', profile.userId);
    }
  }, [profile]);

  // Dark Mode Sync
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auth & Profile Sync
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch all profiles for this user
        const q = query(collection(db, 'users'), where('authUid', '==', u.uid));
        const snap = await getDocs(q);
        const profiles = snap.docs.map(d => d.data() as UserProfile).filter(p => !p.isDeleted);
        setAllProfiles(profiles);

        if (profiles.length > 0) {
          const savedUserId = localStorage.getItem('lastSelectedUserId');
          const savedProfile = profiles.find(p => p.userId === savedUserId);
          setProfile(savedProfile || profiles[0]);
        } else {
          setIsProfileModalOpen(true);
        }
      }
    });
  }, []);

  // Measurement Sync
  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'measurements'),
      where('authUid', '==', user?.uid),
      where('userId', '==', profile.userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as VitalMeasurement));
      setMeasurements(data.reverse());
    });
  }, [profile]);

  // AI Analysis Sync
  useEffect(() => {
    if (!profile || !user || measurements.length === 0) return;

    const latest = measurements[measurements.length - 1];
    const q = query(
      collection(db, 'analyses'),
      where('authUid', '==', user.uid),
      where('vitalsId', '==', latest.id),
      limit(1)
    );

    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setAiAnalysis({ id: snap.docs[0].id, ...snap.docs[0].data() } as AIAnalysis);
      } else {
        setAiAnalysis(null);
      }
    });
  }, [profile, measurements]);

  // Bluetooth Callbacks
  const handleLiveData = useCallback((data: MediData) => {
    setLiveData({
      heartRate: data.hr,
      spo2: data.spo2,
      temperature: data.temp,
    });
  }, []);

  const handleFinalData = useCallback(async (data: MediData) => {
    if (!profile) return;

    const measurement: VitalMeasurement = {
      userId: profile.userId,
      authUid: user?.uid || '',
      timestamp: new Date().toISOString(),
      heartRate: data.hr,
      spo2: data.spo2,
      temperature: data.temp,
      stress: (data.stress as any) || 'Low',
      type: 'auto'
    };

    try {
      await addDoc(collection(db, 'measurements'), measurement);
      setLiveData(null);
    } catch (e) {
      console.error("Error saving measurement:", e);
    }
  }, [profile]);

  const handleConnect = async () => {
    if (!profile) {
      alert("Please create or select a profile first!");
      return;
    }
    setIsConnecting(true);
    try {
      await bluetoothService.connect(handleLiveData, handleFinalData, () => {
        setIsConnecting(false);
        setIsConnected(false);
      });
      setIsConnecting(false);
      setIsConnected(true);
    } catch (e) {
      alert("Bluetooth failed: " + (e instanceof Error ? e.message : "Internal error"));
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  const handleManualSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    const formData = new FormData(e.currentTarget);
    const data: VitalMeasurement = {
      userId: profile.userId,
      authUid: user?.uid || '',
      timestamp: new Date().toISOString(),
      heartRate: Number(formData.get('hr')),
      spo2: Number(formData.get('spo2')),
      temperature: Number(formData.get('temp')),
      stress: 'Low',
      type: 'manual'
    };

    await addDoc(collection(db, 'measurements'), data);
    setIsManualModalOpen(false);
  };

  const handleAddDoctor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile || !user) return;

    const formData = new FormData(e.currentTarget);
    const newDoctor: Doctor = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      specialty: formData.get('specialty') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      seed: formData.get('name') as string
    };

    const updatedDoctors = [...(profile.doctors || []), newDoctor];
    try {
      await setDoc(doc(db, 'users', profile.userId), { ...profile, doctors: updatedDoctors }, { merge: true });
      setProfile({ ...profile, doctors: updatedDoctors });
      setIsAddDoctorModalOpen(false);
    } catch (error) {
      console.error("Error adding doctor", error);
      alert("Failed to add doctor");
    }
  };

  const handleSendRecords = async (doctorEmail: string) => {
    if (!profile || !user) return;

    setIsGeneratingLink(true);
    try {
      const reportData: SharedReport = {
        authUid: user.uid,
        patientName: profile.name,
        patientAge: profile.age,
        patientSex: profile.sex,
        patientBloodGroup: profile.bloodGroup,
        patientAvatar: profile.avatarUrl,
        measurements: measurements.slice(-1000), // Limit to recent 1000 records
        createdAt: new Date().toISOString()
      };

      const newReportRef = await addDoc(collection(db, 'shared_reports'), reportData);
      const link = `${window.location.origin}/?report=${newReportRef.id}`;
      setGeneratedLink(link);
    } catch (e) {
      console.error("Failed to generate report", e);
      alert("Failed to generate report link.");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      alert("Link copied to clipboard!");
    }
  };

  const handleOpenGmail = (doctorEmail: string) => {
    if (generatedLink) {
      const subject = encodeURIComponent(`MediBot Vitals Report - ${profile?.name || 'Patient'}`);
      const body = encodeURIComponent(`Hello Doctor,\n\nPlease find the secure link to my interactive health report below.\n\n${generatedLink}\n\nBest regards,\n${profile?.name || 'Patient'}`);
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${doctorEmail}&su=${subject}&body=${body}`;
      window.open(gmailUrl, '_blank');
    }
  };


  const handleCreateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const userId = crypto.randomUUID();

    const newProfile: any = {
      userId,
      authUid: user.uid,
      name,
      bloodGroup: formData.get('blood') as string,
      age: Number(formData.get('age')) || undefined,
      sex: formData.get('sex') as string,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.get('avatarSeed') || name}`,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', userId), newProfile);
    setProfile(newProfile);
    setAllProfiles(prev => [...prev, newProfile]);
    setIsProfileModalOpen(false);
  };

  const handleEditProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    const formData = new FormData(e.currentTarget);
    const updatedProfile = {
      ...profile,
      name: formData.get('name') as string,
      bloodGroup: formData.get('blood') as string,
      age: Number(formData.get('age')) || undefined,
      sex: formData.get('sex') as string,
      height: Number(formData.get('height')) || undefined,
      weight: Number(formData.get('weight')) || undefined,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.get('avatarSeed') || profile?.name}`,
    };

    try {
      await setDoc(doc(db, 'users', profile.userId), updatedProfile, { merge: true });
      setProfile(updatedProfile);
      setAllProfiles(prev => prev.map(p => p.userId === profile.userId ? updatedProfile : p));
      setIsEditProfileModalOpen(false);
    } catch (err) {
      console.error("Failed to update profile", err);
      alert("Failed to update profile");
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await deleteDoc(doc(db, 'measurements', recordId));
    } catch (e) {
      console.error('Error deleting record:', e);
      alert('Failed to delete record');
    }
  };

  const handleDeleteProfile = async (userIdToDelete: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this profile and all its data? This action cannot be undone.')) return;

    try {
      // Soft-delete user document to bypass missing 'delete' permission in remote firestore.rules
      const profileToUpdate = allProfiles.find(p => p.userId === userIdToDelete);
      if (profileToUpdate) {
        await setDoc(doc(db, 'users', userIdToDelete), {
          ...profileToUpdate,
          authUid: user.uid,
          isDeleted: true
        }, { merge: true });
      }

      const mQuery = query(
        collection(db, 'measurements'),
        where('userId', '==', userIdToDelete),
        where('authUid', '==', user.uid)
      );
      const mSnap = await getDocs(mQuery);
      const mPromises = mSnap.docs.map(d => deleteDoc(doc(db, 'measurements', d.id)));
      await Promise.all(mPromises);

      const aQuery = query(
        collection(db, 'analyses'),
        where('userId', '==', userIdToDelete),
        where('authUid', '==', user.uid)
      );
      const aSnap = await getDocs(aQuery);
      const aPromises = aSnap.docs.map(d => deleteDoc(doc(db, 'analyses', d.id)));
      await Promise.all(aPromises);

      const updatedProfiles = allProfiles.filter(p => p.userId !== userIdToDelete);
      setAllProfiles(updatedProfiles);
      if (profile?.userId === userIdToDelete) {
        if (updatedProfiles.length > 0) {
          setProfile(updatedProfiles[0]);
        } else {
          setProfile(null);
          setIsProfileModalOpen(true);
        }
      }
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      alert('Failed to delete profile: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const runAIAnalysis = async () => {
    if (!profile || measurements.length === 0) return;
    const latest = measurements[measurements.length - 1];

    setIsAnalyzing(true);
    const analysisText = await analyzeVitals(
      { hr: latest.heartRate, spo2: latest.spo2, temp: latest.temperature, stress: latest.stress },
      { weight: profile.weight, bloodGroup: profile.bloodGroup }
    );

    await addDoc(collection(db, 'analyses'), {
      userId: profile.userId,
      authUid: user?.uid || '',
      timestamp: new Date().toISOString(),
      content: analysisText,
      vitalsId: latest.id
    });
    setIsAnalyzing(false);
  };

  const sharedReportId = new URLSearchParams(window.location.search).get('report');
  if (sharedReportId) {
    return <SharedReportView reportId={sharedReportId} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dashboard-bg p-4">
        <div className="glass-card max-w-md w-full p-12 text-center flex flex-col items-center gap-8">
          <div className="w-20 h-20 bg-brand-blue rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-3">
            <Heart size={40} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-bold mb-2">MediBot</h1>
            <p className="text-slate-500">Connect your MediBot device to track and analyze your vitals in real-time.</p>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all hover:scale-105"
          >
            <Users size={20} />
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  const latest = measurements[measurements.length - 1];

  return (
    <div className={cn("min-h-screen", darkMode && "dark")}>
      <div className="dark:bg-slate-950 transition-colors duration-300 min-h-screen">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} onSignOut={handleSignOut} />

        <main className={cn("pl-20 transition-all", isProfileModalOpen || isManualModalOpen ? "blur-sm" : "")}>
          <Navbar
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            isConnecting={isConnecting}
            isConnected={isConnected}
            onConnect={handleConnect}
            onManualData={() => setIsManualModalOpen(true)}
            onNewProfile={() => setIsProfileModalOpen(true)}
            currentUser={profile}
            users={allProfiles}
            onSwitchUser={setProfile}
            onDeleteUser={handleDeleteProfile}
          />

          <div className="px-8 pb-8 flex gap-8">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col gap-6 py-6">

              {currentView === 'dashboard' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display">Vital Overview</h2>
                    <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-2"></div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Real-time stats</span>
                  </div>

                  {/* Vitals Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <VitalCard
                      title="Heart Rate"
                      value={liveData?.heartRate || latest?.heartRate || "--"}
                      unit="BPM"
                      icon={Heart}
                      color="blue"
                      trend={liveData?.heartRate ? "Live" : (latest?.heartRate ? "Stable" : undefined)}
                    />
                    <VitalCard
                      title="Oxygen SpO2"
                      value={liveData?.spo2 || latest?.spo2 || "--"}
                      unit="%"
                      icon={Droplets}
                      color="cyan"
                    />
                    <VitalCard
                      title="Hand Temp"
                      value={liveData?.temperature || latest?.temperature || "--"}
                      unit="°C"
                      icon={Thermometer}
                      color="pink"
                    />
                    <VitalCard
                      title="Stress Level"
                      value={latest?.stress || "--"}
                      unit=""
                      icon={Activity}
                      color={latest?.stress === 'Low' ? 'green' : latest?.stress === 'Mod' ? 'yellow' : latest?.stress === 'High' ? 'red' : 'pink'}
                      trend={latest?.stress ? (latest.stress === 'Low' ? "Normal" : "Status") : undefined}
                    />
                  </div>

                  {/* Activity Chart Section */}
                  <div className="sleek-card-fancy p-8 flex flex-col h-[400px]">
                    <ActivityChart data={measurements} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* AI Recommendation Card */}
                    <div className="sleek-card p-6 flex items-start gap-5 relative overflow-hidden group">
                      <div className="w-12 h-12 bg-brand-purple/10 dark:bg-brand-purple/20 rounded-xl flex items-center justify-center shrink-0 text-brand-purple group-hover:scale-110 transition-transform">
                        <BrainCircuit size={28} />
                      </div>
                      <div className="flex-1 relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">MediBot AI Insights</h3>
                          <button
                            onClick={runAIAnalysis}
                            disabled={isAnalyzing || measurements.length === 0}
                            className="text-brand-purple text-[10px] font-bold tracking-widest hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1 uppercase"
                          >
                            {isAnalyzing ? "Analyzing..." : "REFRESH ANALYSIS"}
                            {!isAnalyzing && <ArrowRight size={14} />}
                          </button>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                          {aiAnalysis ? (
                            <ReactMarkdown>{aiAnalysis.content}</ReactMarkdown>
                          ) : (
                            <p className="opacity-80 italic">No insights available for the current vitals. Click refresh to generate.</p>
                          )}
                        </div>
                      </div>
                      {/* Decorative element */}
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-purple/5 dark:bg-brand-purple/10 rounded-full blur-3xl pointer-events-none"></div>
                    </div>

                    {/* Treatment Card */}
                    <div className="sleek-card p-6 flex flex-col gap-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Daily Regiment</h3>
                        <button className="text-slate-400 hover:text-brand-indigo transition-colors"><MoreHorizontal size={20} /></button>
                      </div>

                      <div className="flex flex-col gap-3">
                        {[
                          { title: 'Hydration Goal', sub: '2.5L Water Intake', icon: Droplets, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
                          { title: 'Cardio Session', sub: '20m Light Walking', icon: Activity, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' },
                          { title: 'Sleep Routine', sub: '8h Deep Rest', icon: Heart, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' }
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:border-brand-indigo/30 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", item.color)}>
                                <item.icon size={18} />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.title}</p>
                                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{item.sub}</p>
                              </div>
                            </div>
                            <MoreHorizontal size={18} className="text-slate-300" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {currentView === 'measure' && (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display">Measure Vitals</h2>
                      <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-2"></div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Live Connect</span>
                    </div>
                  </div>

                  {/* Connect Button Area */}
                  <div className="sleek-card p-8 flex flex-col items-center justify-center text-center gap-4 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800">
                    <div className="w-20 h-20 bg-brand-indigo/10 dark:bg-brand-indigo/20 text-brand-indigo rounded-full flex items-center justify-center mb-2">
                      <Bluetooth size={40} className={isConnecting ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold font-display text-slate-800 dark:text-white">MediBot Device</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">Connect to your MediBot hardware to stream real-time vitals and record your health sessions.</p>
                    </div>
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting || isConnected}
                      className={cn(
                        "mt-4 px-8 py-4 rounded-2xl font-bold text-white transition-all shadow-xl flex items-center gap-3",
                        isConnected ? "bg-emerald-500 cursor-default" :
                          isConnecting ? "bg-indigo-400" : "bg-brand-indigo hover:bg-indigo-600 shadow-indigo-500/30 hover:scale-105 active:scale-95"
                      )}
                    >
                      <Bluetooth size={24} />
                      {isConnected ? "Connected to MediBot" : isConnecting ? "Connecting..." : "Connect to MediBot"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Live Data */}
                    <div className="sleek-card p-6 flex flex-col gap-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="text-rose-500" size={24} />
                          <h3 className="text-lg font-display font-bold text-slate-800 dark:text-slate-100">Live Data</h3>
                        </div>
                        {liveData && <span className="px-3 py-1 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 text-[10px] font-bold uppercase rounded-full animate-pulse">Streaming</span>}
                      </div>

                      {liveData ? (
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <Heart className="text-brand-blue" />
                              <span className="font-bold text-slate-600 dark:text-slate-300">Heart Rate</span>
                            </div>
                            <span className="text-2xl font-bold font-display text-slate-800 dark:text-white">{liveData.heartRate} <span className="text-sm text-slate-400">BPM</span></span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <Droplets className="text-cyan-500" />
                              <span className="font-bold text-slate-600 dark:text-slate-300">SpO2</span>
                            </div>
                            <span className="text-2xl font-bold font-display text-slate-800 dark:text-white">{liveData.spo2} <span className="text-sm text-slate-400">%</span></span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <Thermometer className="text-pink-500" />
                              <span className="font-bold text-slate-600 dark:text-slate-300">Hand Temperature</span>
                            </div>
                            <span className="text-2xl font-bold font-display text-slate-800 dark:text-white">{liveData.temperature} <span className="text-sm text-slate-400">°C</span></span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
                          <Activity size={48} className="mb-4 opacity-20" />
                          <p>Waiting for connection...</p>
                        </div>
                      )}
                    </div>

                    {/* AI Health Analysis */}
                    <div className="sleek-card p-6 flex flex-col gap-6 relative overflow-hidden">
                      <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-purple/10 dark:bg-brand-purple/20 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="text-brand-purple" size={24} />
                          <h3 className="text-lg font-display font-bold text-slate-800 dark:text-slate-100">AI Health Analysis</h3>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col relative z-10 gap-4">
                        <button
                          onClick={runAIAnalysis}
                          disabled={isAnalyzing || measurements.length === 0}
                          className="w-full py-4 bg-brand-purple hover:bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2"
                        >
                          {isAnalyzing ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <BrainCircuit size={20} />
                              Analyze Session Records
                            </>
                          )}
                        </button>

                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 overflow-y-auto min-h-[200px]">
                          {aiAnalysis ? (
                            <div className="prose prose-sm dark:prose-invert">
                              <ReactMarkdown>{aiAnalysis.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                              <p className="text-center">No analysis yet.<br />Click above to generate insights.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Records */}
                  <div className="sleek-card p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <History className="text-brand-blue" size={24} />
                      <h3 className="text-lg font-display font-bold text-slate-800 dark:text-slate-100">Session Records</h3>
                    </div>

                    {measurements.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="text-xs font-bold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="pb-3 px-4">Time</th>
                              <th className="pb-3 px-4">Heart Rate</th>
                              <th className="pb-3 px-4">SpO2</th>
                              <th className="pb-3 px-4">Temp</th>
                              <th className="pb-3 px-4">Stress</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {measurements.slice().reverse().slice(0, 10).map(m => (
                              <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="py-4 px-4 text-sm">{new Date(m.timestamp).toLocaleTimeString()}</td>
                                <td className="py-4 px-4 font-medium"><span className="text-brand-blue">{m.heartRate}</span> BPM</td>
                                <td className="py-4 px-4 font-medium"><span className="text-cyan-500">{m.spo2}</span>%</td>
                                <td className="py-4 px-4 font-medium"><span className="text-pink-500">{m.temperature}</span>°C</td>
                                <td className="py-4 px-4">
                                  <span className={cn(
                                    "px-2 py-1 rounded-lg text-xs font-bold",
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
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        No session records available yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentView === 'history' && (
                <div className="flex flex-col gap-8">
                  <div className="flex items-center justify-between">
                    <h1 className="text-5xl font-display font-bold">Patient History</h1>
                    <div className="relative">
                      <button
                        onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold text-sm"
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
                                  <button
                                    onClick={() => setIsFilterDropdownOpen(false)}
                                    className="w-full py-2 bg-brand-indigo text-white rounded-lg text-xs font-bold hover:bg-brand-indigo-hover transition-all"
                                  >
                                    Apply Filter
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="sleek-card overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Heart Rate</th>
                          <th className="px-6 py-4">SpO2</th>
                          <th className="px-6 py-4">Temp</th>
                          <th className="px-6 py-4">Stress</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredHistory.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium">{new Date(m.timestamp).toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm">{m.heartRate} BPM</td>
                            <td className="px-6 py-4 text-sm">{m.spo2}%</td>
                            <td className="px-6 py-4 text-sm">{m.temperature}°C</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                m.stress === 'Low' ? "bg-green-100 text-green-600" :
                                  m.stress === 'Mod' ? "bg-orange-100 text-orange-600" :
                                    "bg-red-100 text-red-600"
                              )}>
                                {m.stress}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400 capitalize">{m.type}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteRecord(m.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar Area */}
            {currentView === 'dashboard' && (
              <div className="w-96 flex flex-col gap-6 py-6">
                <div className="sleek-card p-4">
                  <Calendar measurements={measurements} />
                </div>

                <div className="sleek-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Doctors</h3>
                    <button onClick={() => setIsDoctorsModalOpen(true)} className="text-brand-indigo text-[10px] font-bold tracking-widest hover:text-indigo-600 transition-colors">SEE ALL</button>
                  </div>
                  <div className="flex items-center gap-4">
                    {doctorsList.slice(0, 4).map(doc => (
                      <div key={doc.id} className="flex flex-col items-center gap-1.5 group cursor-pointer" onClick={() => setIsDoctorsModalOpen(true)}>
                        <div className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-800 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.seed}`} alt={doc.name} className="w-full h-full" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 text-center leading-tight whitespace-nowrap">{doc.name.split('. ')[1] || doc.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sleek-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">User Detail</h3>
                    <button onClick={() => setIsEditProfileModalOpen(true)} className="text-brand-indigo text-[10px] font-bold tracking-widest">SEE ALL</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Blood Group', value: profile?.bloodGroup || '--' },
                      { label: 'Height', value: profile?.height ? `${profile.height} CM` : '--' },
                      { label: 'Weight', value: profile?.weight ? `${profile.weight} KG` : '--' },
                      { label: 'Age/Sex', value: `${profile?.age || '--'} / ${profile?.sex || '--'}` }
                    ].map((det, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{det.label}</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{det.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Profile Modal */}
        <AnimatePresence>
          {isProfileModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-brand-blue text-white rounded-xl flex items-center justify-center"><UserPlus /></div>
                  <h2 className="text-2xl font-display font-bold">Create Profile</h2>
                </div>
                <form onSubmit={handleCreateProfile} className="flex flex-col gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Full Name</label>
                    <input name="name" required placeholder="John Doe" className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-blue/30" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Blood</label>
                      <select name="blood" required className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-blue/30 text-sm">
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Age</label>
                      <input name="age" type="number" placeholder="30" required className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-blue/30" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Sex</label>
                      <select name="sex" required className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-blue/30 text-sm">
                        <option value="">Select</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Select Avatar</label>
                    <div className="grid grid-cols-6 gap-3">
                      {['Felix', 'Aneka', 'Jack', 'Jocelyn', 'Oliver', 'Maria', 'Jasper', 'Bella', 'Max', 'Sara', 'Simon', 'Zoe'].map(seed => (
                        <label key={seed} className="cursor-pointer group relative">
                          <input type="radio" name="avatarSeed" value={seed} defaultChecked={seed === 'Felix'} className="peer sr-only" />
                          <div className="w-12 h-12 rounded-full border-2 border-transparent peer-checked:border-brand-blue peer-checked:scale-110 transition-all overflow-hidden bg-slate-50 dark:bg-slate-800">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={seed} className="w-full h-full" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-blue rounded-full text-white flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                            <Check size={10} />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="mt-4 w-full py-4 bg-brand-blue text-white rounded-2xl font-bold shadow-lg shadow-brand-blue/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Save Profile
                  </button>
                  {allProfiles.length > 0 && (
                    <button type="button" onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors">Cancel</button>
                  )}
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isEditProfileModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-brand-indigo text-white rounded-xl flex items-center justify-center"><UserPlus /></div>
                  <h2 className="text-2xl font-display font-bold">Edit Profile</h2>
                </div>
                <form onSubmit={handleEditProfile} className="flex flex-col gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Full Name</label>
                    <input name="name" defaultValue={profile?.name} required placeholder="John Doe" className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-indigo/30" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Blood</label>
                      <select name="blood" defaultValue={profile?.bloodGroup} required className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-indigo/30 text-sm">
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Age</label>
                      <input name="age" type="number" defaultValue={profile?.age} placeholder="30" required className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-indigo/30" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Sex</label>
                      <select name="sex" defaultValue={profile?.sex} required className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-indigo/30 text-sm">
                        <option value="">Select</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Height (cm)</label>
                      <input name="height" type="number" defaultValue={profile?.height} placeholder="170" className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-indigo/30" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Weight (kg)</label>
                      <input name="weight" type="number" defaultValue={profile?.weight} placeholder="70" className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-indigo/30" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Select Avatar</label>
                    <div className="grid grid-cols-6 gap-3">
                      {['Felix', 'Aneka', 'Jack', 'Jocelyn', 'Oliver', 'Maria', 'Jasper', 'Bella', 'Max', 'Sara', 'Simon', 'Zoe'].map(seed => (
                        <label key={seed} className="cursor-pointer group relative">
                          <input type="radio" name="avatarSeed" value={seed} defaultChecked={profile?.avatarUrl?.includes(seed) || (!profile?.avatarUrl && seed === 'Felix')} className="peer sr-only" />
                          <div className="w-12 h-12 rounded-full border-2 border-transparent peer-checked:border-brand-indigo peer-checked:scale-110 transition-all overflow-hidden bg-slate-50 dark:bg-slate-800">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={seed} className="w-full h-full" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-indigo rounded-full text-white flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                            <Check size={10} />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="mt-4 w-full py-4 bg-brand-indigo text-white rounded-2xl font-bold shadow-lg shadow-brand-indigo/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Save Details
                  </button>
                  <button type="button" onClick={() => setIsEditProfileModalOpen(false)} className="text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors">Cancel</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Manual Data Modal */}
        <AnimatePresence>
          {isManualModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-brand-purple text-white rounded-xl flex items-center justify-center"><Plus /></div>
                  <h2 className="text-2xl font-display font-bold">Manual Reading</h2>
                </div>
                <form onSubmit={handleManualSave} className="flex flex-col gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Heart Rate (BPM)</label>
                    <input name="hr" type="number" defaultValue="70" required className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-blue/30" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">SpO2 (%)</label>
                    <input name="spo2" type="number" defaultValue="98" required className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-blue/30" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Hand Temperature (°C)</label>
                    <input name="temp" type="number" step="0.1" defaultValue="36.6" required className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-blue/30" />
                  </div>
                  <button type="submit" className="mt-4 w-full py-4 bg-brand-purple text-white rounded-2xl font-bold shadow-lg shadow-brand-purple/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Record Vitals
                  </button>
                  <button type="button" onClick={() => setIsManualModalOpen(false)} className="text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors">Cancel</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Doctors Modal */}
        <AnimatePresence>
          {isDoctorsModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-indigo text-white rounded-xl flex items-center justify-center"><Stethoscope /></div>
                    <h2 className="text-2xl font-display font-bold">My Doctors</h2>
                  </div>
                  <button onClick={() => setIsAddDoctorModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-brand-indigo/10 text-brand-indigo rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-brand-indigo/20 transition-colors">
                    <Plus size={18} />
                    Add Doctor
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctorsList.map(doc => (
                    <div key={doc.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-slate-800">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.seed}`} alt={doc.name} className="w-full h-full" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-100">{doc.name}</h4>
                          <span className="text-[10px] font-bold text-brand-indigo uppercase tracking-wider">{doc.specialty}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Phone size={14} className="text-slate-400" />
                          <span>{doc.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Mail size={14} className="text-slate-400" />
                          <span>{doc.email}</span>
                        </div>
                      </div>

                      {selectedDoctorForEmail?.id === doc.id ? (
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          {generatedLink ? (
                            <div className="flex flex-col gap-3">
                              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center">Link Generated!</p>

                              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                <input
                                  type="text"
                                  readOnly
                                  value={generatedLink}
                                  className="w-full bg-transparent border-none text-xs text-slate-500 focus:ring-0 outline-none truncate"
                                />
                                <button onClick={handleCopyLink} className="p-1.5 bg-white dark:bg-slate-700 text-slate-500 hover:text-brand-indigo rounded-md shadow-sm border border-slate-200 dark:border-slate-600 transition-colors" title="Copy Link">
                                  <Copy size={14} />
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <button onClick={() => handleOpenGmail(doc.email)} className="flex-1 py-2 bg-[#EA4335] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#D93025] transition-colors">
                                  <Send size={14} /> Share via mail
                                </button>
                                <button onClick={() => { setSelectedDoctorForEmail(null); setGeneratedLink(null); }} className="py-2 px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold transition-colors">
                                  Done
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest text-center">Secure Share</p>
                              <p className="text-[11px] text-slate-500 text-center mb-2 leading-tight">Create a secure interactive dashboard link.</p>
                              <div className="flex items-center gap-2">
                                <button disabled={isGeneratingLink} onClick={() => handleSendRecords(doc.email)} className="flex-1 py-2 bg-brand-indigo text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors disabled:opacity-50">
                                  {isGeneratingLink ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Link size={14} />}
                                  {isGeneratingLink ? "Generating..." : "Generate"}
                                </button>
                                <button onClick={() => setSelectedDoctorForEmail(null)} className="py-2 px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => { setSelectedDoctorForEmail(doc); setGeneratedLink(null); }} className="w-full py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <Send size={16} /> Share Records
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 text-right">
                  <button onClick={() => setIsDoctorsModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Doctor Modal */}
        <AnimatePresence>
          {isAddDoctorModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-brand-indigo text-white rounded-xl flex items-center justify-center"><UserPlus /></div>
                  <h2 className="text-2xl font-display font-bold">Add Doctor</h2>
                </div>
                <form onSubmit={handleAddDoctor} className="flex flex-col gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Doctor Name</label>
                    <input name="name" required placeholder="Dr. John Doe" className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-indigo/30" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Specialty</label>
                    <input name="specialty" required placeholder="Cardiology" className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-indigo/30" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Phone Number</label>
                    <input name="phone" required placeholder="+1 234 567 8900" className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-indigo/30" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
                    <input name="email" type="email" required placeholder="doctor@hospital.com" className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-indigo/30" />
                  </div>

                  <button type="submit" className="mt-4 w-full py-4 bg-brand-indigo text-white rounded-2xl font-bold shadow-lg shadow-brand-indigo/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Save Doctor
                  </button>
                  <button type="button" onClick={() => setIsAddDoctorModalOpen(false)} className="text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors">Cancel</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

