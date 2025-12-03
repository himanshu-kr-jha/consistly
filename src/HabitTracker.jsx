// src/HabitTracker.jsx
import React, { useState, useEffect } from 'react';
import {
  Calendar, TrendingUp, Award, Plus, X, Check, Moon,
  BarChart3, User, LogIn, LogOut, Info, Menu
} from 'lucide-react';
import {
  LineChart as RechartsLine, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
// auth helpers (your implementation)
import { setAuthToken, getAuthToken, authFetch } from './api';

/* ---------------------------
  localStorage polyfill for window.storage (keeps app working in browser)
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
  HabitTracker Component
  - Day-wise entries:
    * habitsDefs: array of habit definitions { id, name, color, createdAt }
    * entries: array of day entries { date:'YYYY-MM-DD', completedHabits: [ids], sleep: {hours, quality}, updatedAt }
    * todayEntry: the entry for today (editable). All other days read-only (locked).
----------------------------*/
export default function HabitTracker() {
  // user / auth state
  const [userId, setUserId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // app data
  const [habitsDefs, setHabitsDefs] = useState([]); // habit definitions
  const [entries, setEntries] = useState([]);       // day-wise entries
  const [todayEntry, setTodayEntry] = useState({ date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } });

  // UI
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [showVisualization, setShowVisualization] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [saveStatus, setSaveStatus] = useState('');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

  /* ---------------------------
    Capture token from backend redirect (Google OAuth / JWT)
    If token found: persist & load user data immediately
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
            setUserId(data.userInfo?.email || data.userInfo?.name || '');
          } catch (err) {
            console.error('Failed to load user data after token capture', err);
            setAuthToken(null);
            setIsLoggedIn(false);
          }
        })();
        // clean url
        const cleanUrl = window.location.pathname + window.location.hash.replace(/(\?token=[^&]*)/, '');
        window.history.replaceState({}, document.title, cleanUrl);
        return;
      }
    } catch (e) {
      console.error('token capture error', e);
    }

    // fallback: check persisted token
    const existing = getAuthToken();
    if (existing) {
      setIsLoggedIn(true);
      (async () => {
        try {
          const data = await authFetch('/api/user/data', { method: 'GET' });
          setHabitsDefs(data.habits || []);
          setEntries(data.entries || []);
          setTodayEntry(data.todayEntry || { date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } });
          setUserId(data.userInfo?.email || data.userInfo?.name || '');
        } catch (err) {
          console.error('Failed to fetch user data', err);
          setAuthToken(null);
          setIsLoggedIn(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // responsive listener
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // load / auto-save: when logged in & userId present
  useEffect(() => {
    if (isLoggedIn && userId) loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userId]);

  // We persist only when entries or habitsDefs change and user logged in
  useEffect(() => {
    if (isLoggedIn && userId) {
      // Optionally debounce / batch in the future; for now save when changes happen
      // Note: saving whole arrays to /api/user/data as designed on server
      saveUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, habitsDefs]);

  /* ---------------------------
    Data layer
    - loadUserData: fetch { habits, entries, todayEntry, userInfo }
    - saveUserData: write full data (or you can call saveEntryToServer for single-day updates)
  ----------------------------*/
  const loadUserData = async () => {
    try {
      const data = await authFetch('/api/user/data', { method: 'GET' });
      setHabitsDefs(data.habits || []);
      setEntries(data.entries || []);
      setTodayEntry(data.todayEntry || { date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } });
      setSaveStatus('Data loaded from server');
      setTimeout(() => setSaveStatus(''), 1500);
    } catch (err) {
      console.error('Error loading data:', err);
      setSaveStatus('⚠ Load failed (server)');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const saveUserData = async () => {
    try {
      await authFetch('/api/user/data', {
        method: 'POST',
        body: JSON.stringify({
          // When saving full user data we send habits and entries
          habits: habitsDefs,
          // NOTE: server expects entries as array in new schema
          // we send it so server persists day-wise entries
          entries
        })
      });
      setSaveStatus('✓ Saved to server');
      setTimeout(() => setSaveStatus(''), 1200);
    } catch (err) {
      console.error('Error saving data:', err);
      setSaveStatus('⚠ Save failed (server)');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  /* ---------------------------
    Save a single day entry (used on toggles / sleep save)
    - posts date, completedHabits, sleep, and optionally current habit defs
  ----------------------------*/
  const saveEntryToServer = async (entry) => {
    try {
      await authFetch('/api/user/data', {
        method: 'POST',
        body: JSON.stringify({
          date: entry.date,
          completedHabits: entry.completedHabits,
          sleep: entry.sleep,
          habits: habitsDefs // include defs so server stays in sync (optional)
        })
      });
      setSaveStatus('✓ Saved');
      setTimeout(() => setSaveStatus(''), 1000);
    } catch (err) {
      console.error('Save failed', err);
      setSaveStatus('⚠ Save failed');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  /* ---------------------------
    Auth helpers
  ----------------------------*/
  const handleLoginModalConfirm = (id) => {
    if (id && id.trim()) {
      setUserId(id.trim());
      setIsLoggedIn(true);
      setShowLoginModal(false);
      // Note: for local username-only flow you may persist on server in the future.
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setIsLoggedIn(false);
    setUserId('');
    setHabitsDefs([]);
    setEntries([]);
    setTodayEntry({ date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } });
  };

  /* ---------------------------
    Date helpers & locking
  ----------------------------*/
  function getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  function isDateLocked(dateString) {
    return dateString !== getTodayString();
  }

  /* ---------------------------
    Habit operations (definitions)
  ----------------------------*/
  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    // generate id; use crypto if available; fallback to timestamp
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString();
    const newDef = { id, name: newHabitName.trim(), color: selectedColor, createdAt: new Date() };
    const updatedDefs = [...habitsDefs, newDef];
    setHabitsDefs(updatedDefs);
    setNewHabitName('');
    setShowAddHabit(false);
    // Persist habit defs to server quickly
    try {
      await authFetch('/api/user/data', { method: 'POST', body: JSON.stringify({ habits: updatedDefs }) });
      setSaveStatus('✓ Habit added');
      setTimeout(() => setSaveStatus(''), 1000);
    } catch (err) {
      console.error('Failed to save habit defs', err);
      setSaveStatus('⚠ Save failed');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const deleteHabit = async (habitId) => {
    // Remove habit definition and remove references in entries
    const updatedDefs = habitsDefs.filter(h => h.id !== habitId);
    const updatedEntries = entries.map(e => ({
      ...e,
      completedHabits: (e.completedHabits || []).filter(id => id !== habitId)
    }));
    setHabitsDefs(updatedDefs);
    setEntries(updatedEntries);
    // Update todayEntry too
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
      setSaveStatus('✓ Habit removed');
      setTimeout(() => setSaveStatus(''), 1000);
    } catch (err) {
      console.error('Failed to persist deletion', err);
      setSaveStatus('⚠ Save failed');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  /* ---------------------------
    Toggle habit for TODAY only
    - updates todayEntry, entries state and persists day entry
  ----------------------------*/
  const toggleHabit = (habitId) => {
    const today = getTodayString();
    if (todayEntry.date !== today) {
      // ensure todayEntry date set (in case of stale)
      setTodayEntry({ date: today, completedHabits: [], sleep: { hours: null, quality: null } });
    }

    const isCompleted = (todayEntry.completedHabits || []).includes(habitId);

    const newCompleted = isCompleted
      ? todayEntry.completedHabits.filter(id => id !== habitId)
      : [...(todayEntry.completedHabits || []), habitId];

    const updated = { ...todayEntry, date: today, completedHabits: newCompleted, updatedAt: new Date() };
    setTodayEntry(updated);

    // update entries array (replace today's)
    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== today);
      return [...filtered, updated];
    });

    // persist single day entry
    saveEntryToServer(updated);
  };

  /* ---------------------------
    Sleep saving for TODAY
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
    Helpers for analytics & UI based on entries + habit defs
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
    // Count consecutive days up to today where habitId is present
    const days = getLast30Days(); // check up to last 30 days
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < days.length; i++) {
      const d = days[days.length - 1 - i]; // backward from today
      const ds = getDateString(d);
      const entry = entries.find(e => e.date === ds) || (ds === todayEntry.date ? todayEntry : null);
      if (entry && (entry.completedHabits || []).includes(habitId)) {
        streak++;
      } else {
        // break streak on first missed day
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
    // 4 weeks (current week = Week 4)
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      const weekLabel = `Week ${4 - w}`;
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - w * 7);
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

  // Chart sizes
  const chartHeight = isMobile ? 200 : 250;
  const smallChartHeight = isMobile ? 140 : 200;

  /* ---------------------------
    UI / JSX (keeps your layout but uses habitsDefs & entries)
  ----------------------------*/
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* NAV */}
      <header className="bg-white/70 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {/* <button
                className="p-2 rounded-md hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(v => !v)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button> */}

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                    {/* logo placeholder */}
                    <img src="1.svg" alt="" />
                  </div>
                  <div className="leading-tight">
                    <div className="font-semibold text-gray-800">Log Daily</div>
                    <div className="text-xs text-gray-500">Build better habits</div>
                  </div>
                </div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-4">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-sm text-gray-700 hover:text-gray-900">Home</button>
              <button onClick={() => setShowVisualization(true)} className="text-sm text-gray-700 hover:text-gray-900">Insights</button>
              <button onClick={() => window.scrollTo({ top: 9999, behavior: 'smooth' })} className="text-sm text-gray-700 hover:text-gray-900">Contact</button>
              {!isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.location.href = 'https://api-logdaily-com.onrender.com/auth/google'}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:shadow-sm"
                    aria-label="Sign in with Google"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.5h147.2c-6.4 34.6-25.5 64-54.3 83.7v69.7h87.7c51.2-47.2 81.9-116.5 81.9-198.5z" fill="#4285F4"/>
                      <path d="M272 544.3c73.8 0 135.7-24.4 181-66.4l-87.7-69.7c-24.4 16.3-55.5 26-93.3 26-71.7 0-132.5-48.4-154.3-113.6H27.5v71.6C72.2 483 163.4 544.3 272 544.3z" fill="#34A853"/>
                      <path d="M117.7 326.2c-10.3-30.8-10.3-64 0-94.8V159.8H27.5c-39.8 79.4-39.8 173.5 0 252.9l90.2-86.5z" fill="#FBBC05"/>
                      <path d="M272 107.7c39 0 74 13.4 101.6 39.6l76.2-76.1C407.7 25.8 345.8 0 272 0 163.4 0 72.2 61.3 27.5 159.8l90.2 71.6C139.5 156.1 200.3 107.7 272 107.7z" fill="#EA4335"/>
                    </svg>
                    <span className="hidden lg:inline">Sign in</span>
                  </button>

                  <button onClick={() => setShowLoginModal(true)} className="ml-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">Get started</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="truncate max-w-[8rem]">{userId}</span>
                  </div>
                  <button onClick={handleLogout} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm flex items-center gap-2"><LogOut className="w-4 h-4" />Logout</button>
                </div>
              )}
            </nav>

            {/* mobile right-side */}
            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(v => !v)} className="p-2 rounded-md hover:bg-gray-100">
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white/90">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2">
              <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }} className="text-left">Home</button>
              <button onClick={() => { setShowVisualization(true); setMobileMenuOpen(false); }} className="text-left">Insights</button>
              {!isLoggedIn ? (
                <>
                  <button onClick={() => { window.location.href = 'https://api-logdaily-com.onrender.com/auth/google'; }} className="text-left">Sign in with Google</button>
                  <button onClick={() => { setShowLoginModal(true); setMobileMenuOpen(false); }} className="text-left">Get started</button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-left">{userId}</div>
                    <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="text-sm text-red-500">Logout</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MAIN with bottom padding so sticky footer doesn't overlap */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
        {/* Landing / Hero (for not logged in) */}
        {!isLoggedIn && (
          <section className="mt-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl shadow-lg p-6 sm:p-10 border border-indigo-100 mb-6 overflow-hidden relative">
            <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-indigo-100 opacity-20 blur-3xl"></div>
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Build small habits that add up.</h1>
                <p className="text-gray-600 mb-6">Track daily activities, log sleep, and visualize 30-day trends. Start quickly with a username — or sign in with Google to sync across devices.</p>

                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => setShowLoginModal(true)} className="bg-indigo-600 text-white px-5 py-3 rounded-lg shadow hover:bg-indigo-700">Get started</button>
                  <button onClick={() => window.location.href = 'https://api-logdaily-com.onrender.com/auth/google'} className="flex items-center gap-3 px-5 py-3 rounded-lg border border-gray-200 bg-white hover:shadow">
                    <svg className="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.5h147.2c-6.4 34.6-25.5 64-54.3 83.7v69.7h87.7c51.2-47.2 81.9-116.5 81.9-198.5z" fill="#4285F4"/>
                      <path d="M272 544.3c73.8 0 135.7-24.4 181-66.4l-87.7-69.7c-24.4 16.3-55.5 26-93.3 26-71.7 0-132.5-48.4-154.3-113.6H27.5v71.6C72.2 483 163.4 544.3 272 544.3z" fill="#34A853"/>
                      <path d="M117.7 326.2c-10.3-30.8-10.3-64 0-94.8V159.8H27.5c-39.8 79.4-39.8 173.5 0 252.9l90.2-86.5z" fill="#FBBC05"/>
                      <path d="M272 107.7c39 0 74 13.4 101.6 39.6l76.2-76.1C407.7 25.8 345.8 0 272 0 163.4 0 72.2 61.3 27.5 159.8l90.2 71.6C139.5 156.1 200.3 107.7 272 107.7z" fill="#EA4335"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </div>

                <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                  <li>• Private-by-default — local storage for quick start</li>
                  <li>• Option to use Google sign-in to sync data</li>
                </ul>
              </div>

              <div>
                {/* small feature cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg bg-white shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-700 font-semibold">Daily Habit Tracking</p>
                    <p className="text-xs text-gray-500 mt-1">Mark days and build streaks</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-700 font-semibold">Sleep Logging</p>
                    <p className="text-xs text-gray-500 mt-1">Hours & quality</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-700 font-semibold">30-Day Insights</p>
                    <p className="text-xs text-gray-500 mt-1">Visualize trends</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-700 font-semibold">Future-proof</p>
                    <p className="text-xs text-gray-500 mt-1">Easy to connect Supabase / MongoDB</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tracker UI */}
        {isLoggedIn && (
          <>
            {/* Header controls */}
            <div className="mb-4">
              <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row items-center justify-between'} mb-2`}>
                <div>
                  <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">Welcome back, {userId}</h2>
                </div>
                <div className={`flex ${isMobile ? 'flex-col w-full' : 'items-center gap-2'}`}>
                  {saveStatus && <span className="text-xs text-green-600 font-medium">{saveStatus}</span>}
                  <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
                    <button onClick={() => setShowVisualization(!showVisualization)} className={`flex-1 ${isMobile ? 'py-3' : 'px-3 py-2'} bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg`}>
                      <BarChart3 className="inline w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{showVisualization ? 'Hide Insights' : 'Visualize'}</span>
                      <span className="sm:hidden">Charts</span>
                    </button>
                    <button onClick={() => setShowSleepModal(true)} className={`flex-1 ${isMobile ? 'py-3' : 'px-3 py-2'} bg-blue-600 text-white rounded-lg`}>
                      <Plus className="inline w-4 h-4 mr-2" />
                      Log Sleep
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Visualizations */}
            {showVisualization && (
              <div className="mb-6 space-y-4">
                <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border border-gray-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">30-Day Completion Rate</h3>
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <RechartsLine data={prepareCompletionData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={isMobile ? -45 : -45} textAnchor="end" height={isMobile ? 50 : 60} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="completionRate" stroke="#3b82f6" strokeWidth={2} name="Completion %" />
                    </RechartsLine>
                  </ResponsiveContainer>
                </div>

                {prepareSleepData().length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border border-gray-100">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Sleep Hours Trend</h3>
                      <ResponsiveContainer width="100%" height={smallChartHeight}>
                        <RechartsLine data={prepareSleepData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={isMobile ? -45 : -45} textAnchor="end" height={isMobile ? 50 : 60} />
                          <YAxis domain={[0, 12]} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Line type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={2} name="Sleep Hours" />
                        </RechartsLine>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border border-gray-100">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Sleep Quality</h3>
                      <ResponsiveContainer width="100%" height={smallChartHeight}>
                        <BarChart data={prepareSleepData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={isMobile ? -45 : -45} textAnchor="end" height={isMobile ? 50 : 60} />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="quality" fill="#10b981" name="Quality (1-5)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border border-gray-100">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Habit Performance</h3>
                    <ResponsiveContainer width="100%" height={smallChartHeight}>
                      <BarChart data={prepareHabitBreakdown()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={isMobile ? -45 : -45} textAnchor="end" height={isMobile ? 50 : 60} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="completed" fill="#3b82f6" name="Total Completed" />
                        <Bar dataKey="streak" fill="#10b981" name="Current Streak" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border border-gray-100">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Weekly Comparison</h3>
                    <ResponsiveContainer width="100%" height={smallChartHeight}>
                      <BarChart data={prepareWeeklyComparison()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        {habitsDefs.slice(0, 3).map((habit) => (
                          <Bar key={habit.id} dataKey={habit.name} fill={habit.color} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Stats & Sleep & Habits */}
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6'} mb-6`}>
              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs sm:text-sm mb-1">Progress</p>
                    <p className="text-lg sm:text-3xl font-bold text-indigo-600">{completionRate()}%</p>
                  </div>
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs sm:text-sm mb-1">Streaks</p>
                    <p className="text-lg sm:text-3xl font-bold text-purple-600">{totalStreak()}</p>
                  </div>
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs sm:text-sm mb-1">Habits</p>
                    <p className="text-lg sm:text-3xl font-bold text-green-600">{habitsDefs.length}</p>
                  </div>
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs sm:text-sm mb-1">Avg Sleep</p>
                    <p className="text-lg sm:text-3xl font-bold text-blue-600">{getAverageSleep()}h</p>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Moon className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sleep Tracking */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-800">Sleep Tracking</h2>
                </div>
                <button onClick={() => setShowSleepModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Log Sleep</span>
                </button>
              </div>

              {getTodaySleep() && getTodaySleep().hours != null ? (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Today:</span> {getTodaySleep().hours} hours
                    <span className="ml-2 sm:ml-4">
                      <span className="font-semibold">Quality:</span> {getTodaySleep().quality}/5 ⭐
                    </span>
                  </p>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-gray-400">No sleep logged for today</div>
              )}
            </div>

            {/* Sleep Modal */}
            {showSleepModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                <div className={`bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md sm:p-6 p-4 ${isMobile ? 'h-[85%] overflow-auto' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Log Sleep for Today</h3>
                    <button onClick={() => { setShowSleepModal(false); setSleepHours(''); setSleepQuality(3); }} className="text-gray-500"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hours of Sleep</label>
                    <input type="number" step="0.5" min="0" max="24" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 7.5" />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Quality (1-5)</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <button key={rating} onClick={() => setSleepQuality(rating)} className={`py-2 rounded-lg border-2 transition text-sm ${sleepQuality === rating ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 hover:border-blue-300'}`}>
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button onClick={addSleepEntry} className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700">Save</button>
                    <button onClick={() => { setShowSleepModal(false); setSleepHours(''); setSleepQuality(3); }} className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Habits List */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Your Habits</h2>
                <button onClick={() => setShowAddHabit(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Habit</span>
                </button>
              </div>

              {showAddHabit && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input type="text" placeholder="Enter habit name..." value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" onKeyDown={(e) => e.key === 'Enter' && addHabit()} />
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-xs text-gray-600">Color:</span>
                    {colors.map(color => (
                      <button key={color} onClick={() => setSelectedColor(color)} className={`w-8 h-8 rounded-full border-2 transition ${selectedColor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} aria-label={`select color ${color}`} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addHabit} className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700">Add Habit</button>
                    <button onClick={() => { setShowAddHabit(false); setNewHabitName(''); }} className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300">Cancel</button>
                  </div>
                </div>
              )}

              {habitsDefs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No habits yet. Add your first habit to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {habitsDefs.map(habit => (
                    <div key={habit.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                          <h3 className="font-semibold text-gray-800 truncate">{habit.name}</h3>
                          <span className="text-sm text-gray-500 whitespace-nowrap">{calculateStreakFromEntries(habit.id)}🔥</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => deleteHabit(habit.id)} className="text-gray-400 hover:text-red-500 ml-2"><X className="w-5 h-5" /></button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {getLast7Days().map((date, idx) => {
                          const dateString = getDateString(date);
                          // find entry for that date
                          const entry = entries.find(e => e.date === dateString) || (dateString === todayEntry.date ? todayEntry : null);
                          const isCompleted = entry ? (entry.completedHabits || []).includes(habit.id) : false;
                          const isToday = dateString === getTodayString();

                          return (
                            <button
                              key={idx}
                              onClick={() => isToday && toggleHabit(habit.id)}
                              disabled={!isToday}
                              className={`py-3 rounded-lg border-2 transition text-center ${isCompleted ? '' : 'bg-white'} ${isToday ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-60'}`}
                              style={{ backgroundColor: isCompleted ? habit.color : undefined, color: isCompleted ? 'white' : undefined }}
                              aria-pressed={isCompleted}
                              title={isToday ? 'Toggle for today' : 'Locked (past day)'}
                            >
                              <div className="text-xs font-medium">{date.toLocaleDateString('en-US', { weekday: 'short' })[0]}</div>
                              {isCompleted && <Check className="w-4 h-4 mx-auto mt-1" />}
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

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold"> <img src="1.svg" alt="" /> </div>
            <div>
              <div className="text-sm font-medium text-gray-800">Log Daily</div>
              <div className="text-xs text-gray-500">Small steps. Big change.</div>
            </div>
          </div>

          <div className="text-sm text-gray-600 flex items-center gap-4">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-gray-800">Home</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowVisualization(true); }} className="hover:text-gray-800">Insights</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowLoginModal(true); }} className="hover:text-gray-800">Sign in</a>
          </div>

          <div className="text-xs text-gray-400">© {new Date().getFullYear()} Log Daily • Built with ♥</div>
        </div>
      </footer>

      {/* LOGIN MODAL — Google-themed & username fallback */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Welcome</h3>
              <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-sm text-gray-600 mb-4">Start quickly with a username — or sign in with Google to sync your progress across devices.</p>

            <div className="space-y-3 mb-3">
              <input type="text" placeholder="username or email" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" onKeyDown={(e) => e.key === 'Enter' && handleLoginModalConfirm(userId)} />

              <div className="flex gap-2">
                <button onClick={() => handleLoginModalConfirm(userId)} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg">Continue</button>
                <a href="https://api-logdaily-com.onrender.com/auth/google" className="flex-1 inline-flex items-center justify-center gap-3 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:shadow">
                  <svg className="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.5h147.2c-6.4 34.6-25.5 64-54.3 83.7v69.7h87.7c51.2-47.2 81.9-116.5 81.9-198.5z" fill="#4285F4"/>
                    <path d="M272 544.3c73.8 0 135.7-24.4 181-66.4l-87.7-69.7c-24.4 16.3-55.5 26-93.3 26-71.7 0-132.5-48.4-154.3-113.6H27.5v71.6C72.2 483 163.4 544.3 272 544.3z" fill="#34A853"/>
                    <path d="M117.7 326.2c-10.3-30.8-10.3-64 0-94.8V159.8H27.5c-39.8 79.4-39.8 173.5 0 252.9l90.2-86.5z" fill="#FBBC05"/>
                    <path d="M272 107.7c39 0 74 13.4 101.6 39.6l76.2-76.1C407.7 25.8 345.8 0 272 0 163.4 0 72.2 61.3 27.5 159.8l90.2 71.6C139.5 156.1 200.3 107.7 272 107.7z" fill="#EA4335"/>
                  </svg>
                  <span>Sign in with Google</span>
                </a>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                <strong className="text-gray-700">Why sign in with Google?</strong>
                <p className="mt-1">Sync your habits across devices and enjoy secure authentication without a password.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
