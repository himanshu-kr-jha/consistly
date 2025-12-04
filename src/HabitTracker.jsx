import React, { useState, useEffect } from 'react';
import {
  Calendar, TrendingUp, Award, Plus, X, Check, Moon,
  BarChart3, User, LogIn, LogOut, Info, Menu, Sparkles
} from 'lucide-react';
import {
  LineChart as RechartsLine, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { setAuthToken, getAuthToken, authFetch } from './api';

/* ---------------------------
  localStorage polyfill for window.storage
---------------------------- */
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async get(key) {
      try {
        const value = localStorage.getItem(key);
        return { value };
      } catch (e) {
        console.error('storage.get error', e);
        return { value: null };
      }
    },
    async set(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.error('storage.set error', e);
        return false;
      }
    }
  };
}

/* ---------------------------
  HabitTracker Component with Enhanced UI
----------------------------*/
export default function HabitTracker() {
  const [userId, setUserId] = useState('');
  const [username, setUserName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [habitsDefs, setHabitsDefs] = useState([]);
  const [entries, setEntries] = useState([]);
  const [todayEntry, setTodayEntry] = useState({ 
    date: getTodayString(), 
    completedHabits: [], 
    sleep: { hours: null, quality: null } 
  });

  // UI State
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [showVisualization, setShowVisualization] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [saveStatus, setSaveStatus] = useState('');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const colors = ['#6366f1', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

  /* ---------------------------
    Token capture from OAuth redirect
  ----------------------------*/
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      let tokenFromUrl = params.get('token');
      if (!tokenFromUrl && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        tokenFromUrl = hashParams.get('token');
      }

      if (tokenFromUrl) {
        setAuthToken(tokenFromUrl);
        setIsLoggedIn(true);
        (async () => {
          try {
            const data = await authFetch('/api/user/data', { method: 'GET' });
            setHabitsDefs(data.habits || []);
            setEntries(data.entries || []);
            setTodayEntry(data.todayEntry || { date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } });
            setUserId(data.userInfo?.email || '');
            setUserName(data.userInfo?.name || '');
          } catch (err) {
            console.error('Failed to load user data after token capture', err);
            setAuthToken(null);
            setIsLoggedIn(false);
          }
        })();
        const cleanUrl = window.location.pathname + window.location.hash.replace(/(\?token=[^&]*)/, '');
        window.history.replaceState({}, document.title, cleanUrl);
        return;
      }
    } catch (e) {
      console.error('token capture error', e);
    }

    const existing = getAuthToken();
    if (existing) {
      setIsLoggedIn(true);
      (async () => {
        try {
          const data = await authFetch('/api/user/data', { method: 'GET' });
          setHabitsDefs(data.habits || []);
          setEntries(data.entries || []);
          setTodayEntry(data.todayEntry || { date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } });
          setUserId(data.userInfo?.email || '');
          setUserName(data.userInfo?.name || '');

        } catch (err) {
          console.error('Failed to fetch user data', err);
          setAuthToken(null);
          setIsLoggedIn(false);
        }
      })();
    }
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isLoggedIn && userId) loadUserData();
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (isLoggedIn && userId) {
      saveUserData();
    }
  }, [entries, habitsDefs]);

  /* ---------------------------
    Data operations
  ----------------------------*/
  const loadUserData = async () => {
    try {
      const data = await authFetch('/api/user/data', { method: 'GET' });
      setHabitsDefs(data.habits || []);
      setEntries(data.entries || []);
      setTodayEntry(data.todayEntry || { date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } });
      showSaveStatus('✓ Data loaded', 'success');
    } catch (err) {
      console.error('Error loading data:', err);
      showSaveStatus('⚠ Load failed', 'error');
    }
  };

  const saveUserData = async () => {
    try {
      await authFetch('/api/user/data', {
        method: 'POST',
        body: JSON.stringify({ habits: habitsDefs, entries })
      });
      showSaveStatus('✓ Saved', 'success');
    } catch (err) {
      console.error('Error saving data:', err);
      showSaveStatus('⚠ Save failed', 'error');
    }
  };

  const saveEntryToServer = async (entry) => {
    try {
      await authFetch('/api/user/data', {
        method: 'POST',
        body: JSON.stringify({
          date: entry.date,
          completedHabits: entry.completedHabits,
          sleep: entry.sleep,
          habits: habitsDefs
        })
      });
      showSaveStatus('✓ Saved', 'success');
    } catch (err) {
      console.error('Save failed', err);
      showSaveStatus('⚠ Save failed', 'error');
    }
  };

  const showSaveStatus = (message, type = 'success') => {
    setSaveStatus(message);
    setTimeout(() => setSaveStatus(''), type === 'success' ? 1200 : 2000);
  };

  /* ---------------------------
    Auth helpers
  ----------------------------*/
  const handleLoginModalConfirm = (id) => {
    if (id && id.trim()) {
      setUserId(id.trim());
      setIsLoggedIn(true);
      setShowLoginModal(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setIsLoggedIn(false);
    setUserId('');
    setUserName('');
    setHabitsDefs([]);
    setEntries([]);
    setTodayEntry({ date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } });
  };

  /* ---------------------------
    Date helpers
  ----------------------------*/
  function getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  function isDateLocked(dateString) {
    return dateString !== getTodayString();
  }

  /* ---------------------------
    Habit operations
  ----------------------------*/
  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString();
    const newDef = { id, name: newHabitName.trim(), color: selectedColor, createdAt: new Date() };
    const updatedDefs = [...habitsDefs, newDef];
    setHabitsDefs(updatedDefs);
    setNewHabitName('');
    setShowAddHabit(false);
    
    try {
      await authFetch('/api/user/data', { method: 'POST', body: JSON.stringify({ habits: updatedDefs }) });
      showSaveStatus('✓ Habit added', 'success');
    } catch (err) {
      console.error('Failed to save habit defs', err);
      showSaveStatus('⚠ Save failed', 'error');
    }
  };

  const deleteHabit = async (habitId) => {
    const updatedDefs = habitsDefs.filter(h => h.id !== habitId);
    const updatedEntries = entries.map(e => ({
      ...e,
      completedHabits: (e.completedHabits || []).filter(id => id !== habitId)
    }));
    setHabitsDefs(updatedDefs);
    setEntries(updatedEntries);
    
    if (todayEntry && todayEntry.completedHabits.includes(habitId)) {
      const updatedToday = { ...todayEntry, completedHabits: todayEntry.completedHabits.filter(id => id !== habitId) };
      setTodayEntry(updatedToday);
      await saveEntryToServer(updatedToday);
    }
    
    try {
      await authFetch('/api/user/data', {
        method: 'POST',
        body: JSON.stringify({ habits: updatedDefs, entries: updatedEntries })
      });
      showSaveStatus('✓ Habit removed', 'success');
    } catch (err) {
      console.error('Failed to persist deletion', err);
      showSaveStatus('⚠ Save failed', 'error');
    }
  };

  const toggleHabit = (habitId) => {
    const today = getTodayString();
    if (todayEntry.date !== today) {
      setTodayEntry({ date: today, completedHabits: [], sleep: { hours: null, quality: null } });
    }

    const isCompleted = (todayEntry.completedHabits || []).includes(habitId);
    const newCompleted = isCompleted
      ? todayEntry.completedHabits.filter(id => id !== habitId)
      : [...(todayEntry.completedHabits || []), habitId];

    const updated = { ...todayEntry, date: today, completedHabits: newCompleted, updatedAt: new Date() };
    setTodayEntry(updated);

    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== today);
      return [...filtered, updated];
    });

    saveEntryToServer(updated);
  };

  /* ---------------------------
    Sleep operations
  ----------------------------*/
  const addSleepEntry = () => {
    if (sleepHours === '') return;
    const hoursNum = parseFloat(sleepHours);
    const today = getTodayString();

    const updated = { ...todayEntry, date: today, sleep: { hours: hoursNum, quality: sleepQuality }, updatedAt: new Date() };
    setTodayEntry(updated);

    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== today);
      return [...filtered, updated];
    });

    setSleepHours('');
    setSleepQuality(3);
    setShowSleepModal(false);
    saveEntryToServer(updated);
  };

  /* ---------------------------
    Analytics helpers
  ----------------------------*/
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const getLast30Days = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const getDateString = (date) => date.toISOString().split('T')[0];

  const completionRate = () => {
    if (!habitsDefs || habitsDefs.length === 0) return 0;
    const today = getTodayString();
    const entry = entries.find(e => e.date === today) || todayEntry;
    const completedToday = (entry.completedHabits || []).length;
    return Math.round((completedToday / habitsDefs.length) * 100);
  };

  const calculateStreakFromEntries = (habitId) => {
    const days = getLast30Days();
    let streak = 0;
    for (let i = 0; i < days.length; i++) {
      const d = days[days.length - 1 - i];
      const ds = getDateString(d);
      const entry = entries.find(e => e.date === ds) || (ds === todayEntry.date ? todayEntry : null);
      if (entry && (entry.completedHabits || []).includes(habitId)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const totalStreak = () => {
    return habitsDefs.reduce((sum, h) => sum + calculateStreakFromEntries(h.id), 0);
  };

  const getTodaySleep = () => {
    const t = getTodayString();
    const e = entries.find(en => en.date === t) || todayEntry;
    return e ? e.sleep : { hours: null, quality: null };
  };

  const getAverageSleep = () => {
    const withSleep = entries.filter(e => e.sleep && e.sleep.hours != null);
    if (withSleep.length === 0) return 0;
    const total = withSleep.reduce((s, e) => s + e.sleep.hours, 0);
    return (total / withSleep.length).toFixed(1);
  };

  const prepareCompletionData = () => {
    const last30 = getLast30Days();
    return last30.map(d => {
      const ds = getDateString(d);
      const entry = entries.find(e => e.date === ds);
      const completedCount = entry ? entry.completedHabits.length : 0;
      const rate = habitsDefs.length ? Math.round((completedCount / habitsDefs.length) * 100) : 0;
      return { date: formatDate(d), completionRate: rate, completed: completedCount, total: habitsDefs.length };
    });
  };

  const prepareSleepData = () => {
    const list = entries
      .filter(e => e.sleep && e.sleep.hours != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(e => ({ date: formatDate(new Date(e.date)), hours: e.sleep.hours, quality: e.sleep.quality }));
    return list;
  };

  const prepareHabitBreakdown = () => {
    return habitsDefs.map(h => {
      const total = entries.reduce((s, e) => s + ((e.completedHabits || []).includes(h.id) ? 1 : 0), 0);
      return { name: h.name, completed: total, streak: calculateStreakFromEntries(h.id), color: h.color };
    });
  };

  const prepareWeeklyComparison = () => {
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      const weekLabel = `Week ${4 - w}`;
      const weekData = { week: weekLabel };
      habitsDefs.forEach(h => {
        const count = entries.reduce((s, e) => {
          const d = new Date(e.date);
          const daysAgo = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
          if (daysAgo >= w * 7 && daysAgo < (w + 1) * 7) {
            return s + ((e.completedHabits || []).includes(h.id) ? 1 : 0);
          }
          return s;
        }, 0);
        weekData[h.name] = count;
      });
      weeks.push(weekData);
    }
    return weeks;
  };

  const chartHeight = isMobile ? 200 : 280;
  const smallChartHeight = isMobile ? 160 : 220;

  /* ---------------------------
    JSX Render
  ----------------------------*/
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100/50 sticky top-0 z-40 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <img src="/logo.png" alt="Log Daily" className="w-10 h-10" />
                </div>
                <div className="leading-tight">
                  <div className="font-bold text-gray-800 text-lg">Log Daily</div>
                  <div className="text-xs text-gray-500 font-medium">Build better habits</div>
                </div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
                Home
              </button>
              <button onClick={() => setShowVisualization(true)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
                Insights
              </button>
              
              {!isLoggedIn ? (
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => window.location.href = 'https://api-logdaily-com.onrender.com/auth/google'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:shadow-md hover:border-gray-300 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                      <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.5h147.2c-6.4 34.6-25.5 64-54.3 83.7v69.7h87.7c51.2-47.2 81.9-116.5 81.9-198.5z" fill="#4285F4"/>
                      <path d="M272 544.3c73.8 0 135.7-24.4 181-66.4l-87.7-69.7c-24.4 16.3-55.5 26-93.3 26-71.7 0-132.5-48.4-154.3-113.6H27.5v71.6C72.2 483 163.4 544.3 272 544.3z" fill="#34A853"/>
                      <path d="M117.7 326.2c-10.3-30.8-10.3-64 0-94.8V159.8H27.5c-39.8 79.4-39.8 173.5 0 252.9l90.2-86.5z" fill="#FBBC05"/>
                      <path d="M272 107.7c39 0 74 13.4 101.6 39.6l76.2-76.1C407.7 25.8 345.8 0 272 0 163.4 0 72.2 61.3 27.5 159.8l90.2 71.6C139.5 156.1 200.3 107.7 272 107.7z" fill="#EA4335"/>
                    </svg>
                    <span className="hidden lg:inline">Sign in</span>
                  </button>

                  <button onClick={() => setShowLoginModal(true)} className="ml-2 px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200">
                    Get started
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 ml-2">
                  <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-sm flex items-center gap-2 shadow-sm">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="truncate max-w-[8rem] font-medium text-gray-700">{userId}</span>
                  </div>
                  <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium flex items-center gap-2 transition-all duration-200">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </nav>

            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(v => !v)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md animate-in slide-in-from-top duration-200">
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">
              <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }} className="text-left px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                Home
              </button>
              <button onClick={() => { setShowVisualization(true); setMobileMenuOpen(false); }} className="text-left px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                Insights
              </button>
              {!isLoggedIn ? (
                <>
                  <button onClick={() => { window.location.href = 'https://api-logdaily-com.onrender.com/auth/google'; }} className="text-left px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                    Sign in with Google
                  </button>
                  <button onClick={() => { setShowLoginModal(true); setMobileMenuOpen(false); }} className="text-left px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">
                    Get started
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="text-sm font-medium">{userId}</div>
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="text-sm text-red-500 font-medium">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 pt-6">
        {/* Landing Hero */}
        {!isLoggedIn && (
          <section className="mt-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-3xl shadow-2xl p-8 sm:p-12 border border-indigo-100/50 mb-8 overflow-hidden relative group">
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-200/30 to-purple-200/30 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-purple-200/30 to-pink-200/30 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
            
            <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-indigo-200 text-sm font-medium text-indigo-700 mb-4 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                  Start your journey today
                </div>
                
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                  Build small habits<br />that <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">add up.</span>
                </h1>
                
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Track daily activities, log sleep, and visualize 30-day trends. Start quickly with a username — or sign in with Google to sync across devices.
                </p>

                <div className="flex gap-4 flex-wrap mb-8">
                  <button 
                    onClick={() => setShowLoginModal(true)} 
                    className="group px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
                  >
                    Get started
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  <button 
                    onClick={() => window.location.href = 'https://api-logdaily-com.onrender.com/auth/google'} 
                    className="flex items-center gap-3 px-8 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-200 font-semibold"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                      <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.5h147.2c-6.4 34.6-25.5 64-54.3 83.7v69.7h87.7c51.2-47.2 81.9-116.5 81.9-198.5z" fill="#4285F4"/>
                      <path d="M272 544.3c73.8 0 135.7-24.4 181-66.4l-87.7-69.7c-24.4 16.3-55.5 26-93.3 26-71.7 0-132.5-48.4-154.3-113.6H27.5v71.6C72.2 483 163.4 544.3 272 544.3z" fill="#34A853"/>
                      <path d="M117.7 326.2c-10.3-30.8-10.3-64 0-94.8V159.8H27.5c-39.8 79.4-39.8 173.5 0 252.9l90.2-86.5z" fill="#FBBC05"/>
                      <path d="M272 107.7c39 0 74 13.4 101.6 39.6l76.2-76.1C407.7 25.8 345.8 0 272 0 163.4 0 72.2 61.3 27.5 159.8l90.2 71.6C139.5 156.1 200.3 107.7 272 107.7z" fill="#EA4335"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Private-by-default with local storage</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Optional Google sign-in to sync</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: 'Daily Habit Tracking', desc: 'Mark days and build streaks', icon: Calendar, color: 'from-blue-500 to-cyan-500' },
                    { title: 'Sleep Logging', desc: 'Hours & quality tracking', icon: Moon, color: 'from-purple-500 to-pink-500' },
                    { title: '30-Day Insights', desc: 'Visualize trends', icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
                    { title: 'Future-proof', desc: 'Easy to expand', icon: Sparkles, color: 'from-orange-500 to-red-500' }
                  ].map((feature, idx) => (
                    <div key={idx} className="p-6 rounded-2xl bg-white shadow-lg border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <p className="font-semibold text-gray-800 mb-2">{feature.title}</p>
                      <p className="text-sm text-gray-600">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tracker UI (Logged In) */}
        {isLoggedIn && (
          <>
            {/* Header Controls */}
            <div className="mb-6">
              <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row items-center justify-between'} mb-4`}>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
                    Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{username || userId}</span>
                  </h2>
                  <p className="text-sm text-gray-600">Keep building those amazing habits! 🎯</p>
                </div>
                
                <div className={`flex ${isMobile ? 'flex-col w-full' : 'items-center gap-3'}`}>
                  {saveStatus && (
                    <span className="text-sm font-medium text-green-600 flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                      {saveStatus}
                    </span>
                  )}
                  
                  <div className={`flex gap-3 ${isMobile ? 'w-full' : ''}`}>
                    <button 
                      onClick={() => setShowVisualization(!showVisualization)} 
                      className={`flex-1 ${isMobile ? 'py-3' : 'px-5 py-3'} bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2`}
                    >
                      <BarChart3 className="w-5 h-5" />
                      <span>{showVisualization ? 'Hide Insights' : 'View Insights'}</span>
                    </button>
                    
                    <button 
                      onClick={() => setShowSleepModal(true)} 
                      className={`flex-1 ${isMobile ? 'py-3' : 'px-5 py-3'} bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2`}
                    >
                      <Plus className="w-5 h-5" />
                      <span>Log Sleep</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Visualizations */}
            {showVisualization && (
              <div className="mb-8 space-y-6 animate-in fade-in slide-in-from-top duration-500">
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                    30-Day Completion Rate
                  </h3>
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <RechartsLine data={prepareCompletionData()}>
                      <defs>
                        <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 500 }} />
                      <Line type="monotone" dataKey="completionRate" stroke="#6366f1" strokeWidth={3} name="Completion %" dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                    </RechartsLine>
                  </ResponsiveContainer>
                </div>

                {prepareSleepData().length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
                      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Moon className="w-5 h-5 text-purple-600" />
                        Sleep Hours Trend
                      </h3>
                      <ResponsiveContainer width="100%" height={smallChartHeight}>
                        <RechartsLine data={prepareSleepData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={70} stroke="#9ca3af" />
                          <YAxis domain={[0, 12]} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Line type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={3} name="Sleep Hours" dot={{ fill: '#8b5cf6', r: 4 }} />
                        </RechartsLine>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
                      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Award className="w-5 h-5 text-green-600" />
                        Sleep Quality
                      </h3>
                      <ResponsiveContainer width="100%" height={smallChartHeight}>
                        <BarChart data={prepareSleepData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={70} stroke="#9ca3af" />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="quality" fill="#10b981" name="Quality (1-5)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      Habit Performance
                    </h3>
                    <ResponsiveContainer width="100%" height={smallChartHeight}>
                      <BarChart data={prepareHabitBreakdown()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={70} stroke="#9ca3af" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="completed" fill="#3b82f6" name="Total Completed" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="streak" fill="#10b981" name="Current Streak" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-orange-600" />
                      Weekly Comparison
                    </h3>
                    <ResponsiveContainer width="100%" height={smallChartHeight}>
                      <BarChart data={prepareWeeklyComparison()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        {habitsDefs.slice(0, 3).map((habit) => (
                          <Bar key={habit.id} dataKey={habit.name} fill={habit.color} radius={[8, 8, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-4' : 'grid-cols-2 lg:grid-cols-4 gap-6'} mb-8`}>
              {[
                { label: 'Progress', value: `${completionRate()}%`, icon: TrendingUp, color: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-100' },
                { label: 'Streaks', value: totalStreak(), icon: Award, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-100' },
                { label: 'Habits', value: habitsDefs.length, icon: Calendar, color: 'from-green-500 to-emerald-500', bg: 'bg-green-100' },
                { label: 'Avg Sleep', value: `${getAverageSleep()}h`, icon: Moon, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-100' }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs sm:text-sm mb-2 font-medium">{stat.label}</p>
                      <p className={`text-2xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>{stat.value}</p>
                    </div>
                    <div className={`${stat.bg} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className={`w-6 h-6 text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`} style={{ stroke: stat.color.includes('indigo') ? '#6366f1' : stat.color.includes('purple') ? '#a855f7' : stat.color.includes('green') ? '#10b981' : '#3b82f6', strokeWidth: 2 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sleep Tracking Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 mb-6 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                    <Moon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Sleep Tracking</h2>
                </div>
                <button 
                  onClick={() => setShowSleepModal(true)} 
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Log Sleep</span>
                </button>
              </div>

              {getTodaySleep() && getTodaySleep().hours != null ? (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Today's Sleep</p>
                      <p className="text-3xl font-bold text-gray-800">{getTodaySleep().hours} <span className="text-lg text-gray-600">hours</span></p>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm text-gray-600 mb-1">Quality</p>
                      <p className="text-3xl font-bold text-gray-800">{getTodaySleep().quality}/5 <span className="text-2xl">⭐</span></p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Moon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No sleep logged for today. Click the button above to add an entry!</p>
                </div>
              )}
            </div>

            {/* Habits List */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 mb-8 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Your Habits</h2>
                </div>
                <button 
                  onClick={() => setShowAddHabit(true)} 
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Habit</span>
                </button>
              </div>

              {showAddHabit && (
                <div className="mb-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 animate-in fade-in slide-in-from-top duration-300">
                  <input 
                    type="text" 
                    placeholder="Enter habit name..." 
                    value={newHabitName} 
                    onChange={(e) => setNewHabitName(e.target.value)} 
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium transition-all duration-200" 
                    onKeyDown={(e) => e.key === 'Enter' && addHabit()} 
                  />
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <span className="text-sm text-gray-700 font-medium">Color:</span>
                    {colors.map(color => (
                      <button 
                        key={color} 
                        onClick={() => setSelectedColor(color)} 
                        className={`w-10 h-10 rounded-xl border-3 transition-all duration-200 hover:scale-110 ${selectedColor === color ? 'border-gray-800 scale-110 shadow-lg' : 'border-transparent'}`} 
                        style={{ backgroundColor: color }} 
                      />
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={addHabit} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200">
                      Add Habit
                    </button>
                    <button onClick={() => { setShowAddHabit(false); setNewHabitName(''); }} className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {habitsDefs.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Calendar className="w-20 h-20 mx-auto mb-6 opacity-30" />
                  <p className="text-lg font-medium mb-2">No habits yet</p>
                  <p className="text-sm">Add your first habit to get started on your journey!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {habitsDefs.map(habit => (
                    <div key={habit.id} className="border-2 border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-5 h-5 rounded-lg flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: habit.color }} />
                          <h3 className="font-bold text-gray-800 truncate text-lg">{habit.name}</h3>
                          <span className="text-sm font-semibold text-gray-600 whitespace-nowrap flex items-center gap-1">
                            {calculateStreakFromEntries(habit.id)} <span className="text-lg">🔥</span>
                          </span>
                        </div>
                        <button onClick={() => deleteHabit(habit.id)} className="text-gray-400 hover:text-red-500 hover:scale-110 transition-all duration-200 ml-3">
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-2">
                        {getLast7Days().map((date, idx) => {
                          const dateString = getDateString(date);
                          const entry = entries.find(e => e.date === dateString) || (dateString === todayEntry.date ? todayEntry : null);
                          const isCompleted = entry ? (entry.completedHabits || []).includes(habit.id) : false;
                          const isToday = dateString === getTodayString();

                          return (
                            <button
                              key={idx}
                              onClick={() => isToday && toggleHabit(habit.id)}
                              disabled={!isToday}
                              className={`py-4 rounded-xl border-2 transition-all duration-200 text-center group/day relative overflow-hidden ${
                                isCompleted ? 'shadow-md' : 'bg-white hover:bg-gray-50'
                              } ${isToday ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : 'cursor-default opacity-60'}`}
                              style={{ 
                                backgroundColor: isCompleted ? habit.color : undefined, 
                                color: isCompleted ? 'white' : undefined,
                                borderColor: isCompleted ? habit.color : '#e5e7eb'
                              }}
                              title={isToday ? 'Toggle for today' : 'Locked (past day)'}
                            >
                              <div className="text-xs font-bold mb-1">
                                {date.toLocaleDateString('en-US', { weekday: 'short' })[0]}
                              </div>
                              {isCompleted && <Check className="w-5 h-5 mx-auto" />}
                              {!isCompleted && isToday && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/day:opacity-100 transition-opacity duration-200">
                                  <Plus className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Enhanced Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center ">
              <img src="/logo.png" alt="Log Daily" className="w-10 h-10" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">Log Daily</div>
              <div className="text-xs text-gray-500 font-medium">Small steps. Big change.</div>
            </div>
          </div>

          <div className="text-sm text-gray-600 flex items-center gap-6 font-medium">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-gray-900 transition-colors">Home</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowVisualization(true); }} className="hover:text-gray-900 transition-colors">Insights</a>
            {!isLoggedIn && (
              <a href="#" onClick={(e) => { e.preventDefault(); setShowLoginModal(true); }} className="hover:text-gray-900 transition-colors">Sign in</a>
            )}
          </div>

          <div className="text-xs text-gray-400 font-medium">© {new Date().getFullYear()} Log Daily • Built with ♥</div>
        </div>
      </footer>

      {/* Sleep Modal */}
      {showSleepModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200">
          <div className={`bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md sm:p-8 p-6 shadow-2xl ${isMobile ? 'h-[85%] overflow-auto' : ''} animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Moon className="w-7 h-7 text-blue-600" />
                Log Sleep for Today
              </h3>
              <button onClick={() => { setShowSleepModal(false); setSleepHours(''); setSleepQuality(3); }} className="text-gray-400 hover:text-gray-600 hover:scale-110 transition-all duration-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">Hours of Sleep</label>
              <input 
                type="number" 
                step="0.5" 
                min="0" 
                max="24" 
                value={sleepHours} 
                onChange={(e) => setSleepHours(e.target.value)} 
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold transition-all duration-200" 
                placeholder="e.g., 7.5" 
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">Sleep Quality (1-5)</label>
              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button 
                    key={rating} 
                    onClick={() => setSleepQuality(rating)} 
                    className={`py-4 rounded-xl border-2 transition-all duration-200 font-bold text-lg hover:scale-105 ${
                      sleepQuality === rating 
                        ? 'border-blue-600 bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg scale-105' 
                        : 'border-gray-200 hover:border-blue-300 bg-white text-gray-600'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={addSleepEntry} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Save Sleep Log
              </button>
              <button onClick={() => { setShowSleepModal(false); setSleepHours(''); setSleepQuality(3); }} className="flex-1 bg-gray-200 text-gray-700 px-6 py-4 rounded-xl font-bold hover:bg-gray-300 transition-all duration-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-60 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Welcome! 👋</h3>
              <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-gray-600 hover:scale-110 transition-all duration-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">Start quickly with a username — or sign in with Google to sync your progress across devices.</p>

            <div className="space-y-4 mb-4">
              <input 
                type="text" 
                placeholder="username or email" 
                value={userId} 
                onChange={(e) => setUserId(e.target.value)} 
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium transition-all duration-200" 
                onKeyDown={(e) => e.key === 'Enter' && handleLoginModalConfirm(userId)} 
              />

              <div className="flex gap-3">
                <button onClick={() => handleLoginModalConfirm(userId)} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200">
                  Continue
                </button>
                <a href="https://api-logdaily-com.onrender.com/auth/google" className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-200 font-semibold">
                  <svg className="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                    <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.5h147.2c-6.4 34.6-25.5 64-54.3 83.7v69.7h87.7c51.2-47.2 81.9-116.5 81.9-198.5z" fill="#4285F4"/>
                    <path d="M272 544.3c73.8 0 135.7-24.4 181-66.4l-87.7-69.7c-24.4 16.3-55.5 26-93.3 26-71.7 0-132.5-48.4-154.3-113.6H27.5v71.6C72.2 483 163.4 544.3 272 544.3z" fill="#34A853"/>
                    <path d="M117.7 326.2c-10.3-30.8-10.3-64 0-94.8V159.8H27.5c-39.8 79.4-39.8 173.5 0 252.9l90.2-86.5z" fill="#FBBC05"/>
                    <path d="M272 107.7c39 0 74 13.4 101.6 39.6l76.2-76.1C407.7 25.8 345.8 0 272 0 163.4 0 72.2 61.3 27.5 159.8l90.2 71.6C139.5 156.1 200.3 107.7 272 107.7z" fill="#EA4335"/>
                  </svg>
                  <span>Google</span>
                </a>
              </div>

              <div className="text-xs text-gray-500 mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <strong className="text-gray-700 block mb-2">💡 Why sign in with Google?</strong>
                <p className="leading-relaxed">Sync your habits across devices and enjoy secure authentication without needing a password.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
