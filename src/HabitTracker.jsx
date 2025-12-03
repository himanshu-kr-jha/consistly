import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Award, Plus, X, Check, Moon, BarChart3, User, LogIn, LogOut, Info } from 'lucide-react';
import { LineChart as RechartsLine, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/* ---------------------------
  Small polyfill for window.storage so app runs in browser.
  - When you integrate a real DB / backend, replace calls to window.storage
    with API calls (e.g., Supabase, REST endpoints, Firebase, etc.)
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
  - Top-left: Login / Logout buttons in nav bar
  - Shows About section for non-logged-in users
  - After login, shows personalized tracker
  - Clear comments mark scalability points for auth & DB
---------------------------- */
export default function HabitTracker() {
  // user / auth state
  const [userId, setUserId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // app data
  const [habits, setHabits] = useState([]);
  const [sleepData, setSleepData] = useState([]);

  // UI state
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

  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

  // responsive listener
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load data after login
  useEffect(() => {
    if (isLoggedIn && userId) {
      loadUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userId]);

  // Auto-save whenever habits or sleepData change
  useEffect(() => {
    if (isLoggedIn && userId && (habits.length > 0 || sleepData.length > 0)) {
      saveUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, sleepData]);

  /* ---------------------------
    Data layer
    - CURRENT: window.storage (localStorage polyfill).
    - SCALABILITY NOTES:
      * Replace loadUserData and saveUserData internals with calls to your backend:
        - For Supabase: call supabase.from('habits').select(...) & supabase.from('habits').upsert(...)
        - For MongoDB: call your API endpoints that read/write the DB
        - For Notion: call Notion APIs and map schema
      * For auth: integrate Google Sign-In and use returned user ID / email as `userId`.
      * Keep the public helper names (loadUserData/saveUserData) so swapping implementations is straightforward.
  ----------------------------*/
  const loadUserData = async () => {
    try {
      // Example: local storage retrieval
      const habitsResult = await window.storage.get(`habits:${userId}`);
      const sleepResult = await window.storage.get(`sleep:${userId}`);

      if (habitsResult && habitsResult.value) {
        setHabits(JSON.parse(habitsResult.value));
      } else {
        // default starter habits for new users
        setHabits([
          { id: 1, name: 'Morning Exercise', color: '#3b82f6', streak: 0, completed: [] },
          { id: 2, name: 'Read 30 Minutes', color: '#10b981', streak: 0, completed: [] },
          { id: 3, name: 'Drink 8 Glasses Water', color: '#8b5cf6', streak: 0, completed: [] }
        ]);
      }

      if (sleepResult && sleepResult.value) {
        setSleepData(JSON.parse(sleepResult.value));
      }

      setSaveStatus('Data loaded successfully!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error loading data:', error);
      setHabits([
        { id: 1, name: 'Morning Exercise', color: '#3b82f6', streak: 0, completed: [] },
        { id: 2, name: 'Read 30 Minutes', color: '#10b981', streak: 0, completed: [] },
        { id: 3, name: 'Drink 8 Glasses Water', color: '#8b5cf6', streak: 0, completed: [] }
      ]);
    }
  };

  const saveUserData = async () => {
    try {
      // Example: local storage set
      await window.storage.set(`habits:${userId}`, JSON.stringify(habits));
      await window.storage.set(`sleep:${userId}`, JSON.stringify(sleepData));
      setSaveStatus('✓ Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error saving data:', error);
      setSaveStatus('⚠ Save failed');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  /* ---------------------------
    Auth helpers
    - CURRENT: simple modal-based username input (userId)
    - SCALABILITY NOTES:
      * Replace handleLoginModalConfirm with real OAuth flow:
        - Google: use Google Sign-In, get user info → setUserId(user.email || user.id)
        - Then call loadUserData() to sync user data from DB
      * Consider storing auth tokens in secure HTTP-only cookies or browser secure storage.
  ----------------------------*/
  const handleLoginModalConfirm = (id) => {
    if (id && id.trim()) {
      setUserId(id.trim());
      setIsLoggedIn(true);
      setShowLoginModal(false);
    }
  };

  const handleLogout = () => {
    // SCALING: when using server-backed auth, also call signOut endpoint / revoke token
    setIsLoggedIn(false);
    setUserId('');
    setHabits([]);
    setSleepData([]);
  };

  /* ---------------------------
    Habit & Sleep logic (unchanged)
  ----------------------------*/
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const isCompletedToday = (habit) => habit.completed.includes(getTodayString());

  const toggleHabit = (habitId) => {
    setHabits(habits.map(habit => {
      if (habit.id === habitId) {
        const today = getTodayString();
        const completed = isCompletedToday(habit)
          ? habit.completed.filter(date => date !== today)
          : [...habit.completed, today];

        return { ...habit, completed, streak: calculateStreak(completed) };
      }
      return habit;
    }));
  };

  const calculateStreak = (completedDates) => {
    if (completedDates.length === 0) return 0;
    const sorted = [...completedDates].sort().reverse();
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < sorted.length; i++) {
      const date = new Date(sorted[i]);
      const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
      if (diffDays === i) streak++;
      else break;
    }
    return streak;
  };

  const addHabit = () => {
    if (newHabitName.trim()) {
      setHabits([...habits, { id: Date.now(), name: newHabitName, color: selectedColor, streak: 0, completed: [] }]);
      setNewHabitName('');
      setShowAddHabit(false);
    }
  };

  const deleteHabit = (habitId) => setHabits(habits.filter(h => h.id !== habitId));

  const addSleepEntry = () => {
    if (sleepHours !== '') {
      const today = getTodayString();
      const existingEntry = sleepData.find(entry => entry.date === today);
      if (existingEntry) {
        setSleepData(sleepData.map(entry => entry.date === today ? { ...entry, hours: parseFloat(sleepHours), quality: sleepQuality } : entry));
      } else {
        setSleepData([...sleepData, { date: today, hours: parseFloat(sleepHours), quality: sleepQuality }]);
      }
      setSleepHours('');
      setSleepQuality(3);
      setShowSleepModal(false);
    }
  };

  /* ---------------------------
    Helpers for charts / UI
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
    if (habits.length === 0) return 0;
    const completedToday = habits.filter(isCompletedToday).length;
    return Math.round((completedToday / habits.length) * 100);
  };

  const totalStreak = habits.reduce((sum, habit) => sum + habit.streak, 0);
  const getTodaySleep = () => sleepData.find(entry => entry.date === getTodayString());
  const getAverageSleep = () => {
    if (sleepData.length === 0) return 0;
    const total = sleepData.reduce((sum, entry) => sum + entry.hours, 0);
    return (total / sleepData.length).toFixed(1);
  };

  const prepareCompletionData = () => {
    const last30Days = getLast30Days();
    return last30Days.map(date => {
      const dateString = getDateString(date);
      const completed = habits.filter(habit => habit.completed.includes(dateString)).length;
      const rate = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
      return { date: formatDate(date), completionRate: rate, completed, total: habits.length };
    });
  };

  const prepareSleepData = () => {
    const last30Days = getLast30Days();
    return last30Days.map(date => {
      const dateString = getDateString(date);
      const entry = sleepData.find(e => e.date === dateString);
      return { date: formatDate(date), hours: entry ? entry.hours : null, quality: entry ? entry.quality : null };
    }).filter(d => d.hours !== null);
  };

  const prepareHabitBreakdown = () => habits.map(habit => ({ name: habit.name, completed: habit.completed.length, streak: habit.streak, color: habit.color }));

  const prepareWeeklyComparison = () => {
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      const weekData = { week: `Week ${4 - w}` };
      habits.forEach(habit => {
        const count = habit.completed.filter(dateStr => {
          const date = new Date(dateStr);
          const daysAgo = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
          return daysAgo >= w * 7 && daysAgo < (w + 1) * 7;
        }).length;
        weekData[habit.name] = count;
      });
      weeks.push(weekData);
    }
    return weeks;
  };

  // Chart sizes
  const chartHeight = isMobile ? 200 : 250;
  const smallChartHeight = isMobile ? 140 : 200;

  /* ---------------------------
    UI: Navigation bar (login/logout on left)
    - Left side: brand + Login/Logout
    - Right side: optional quick actions
  ----------------------------*/
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-3 sm:p-6">
      {/* NAV */}
      <nav className="max-w-6xl mx-auto flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Left corner: Login / Logout */}
          {!isLoggedIn ? (
            <>
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </button>

              {/* About button */}
              <button
                onClick={() => window.scrollTo({ top: 200, behavior: 'smooth' })}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-gray-700 border border-gray-200 hover:shadow-sm"
              >
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">About</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              <div className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-700">
                <User className="inline w-4 h-4 mr-2" />
                {userId}
              </div>
            </>
          )}
        </div>

        {/* Right area: App title / quick actions */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800">Habit Tracker</h1>
        </div>
      </nav>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Login / Start</h3>
              <button onClick={() => setShowLoginModal(false)} className="text-gray-500"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-sm text-gray-600 mb-3">Enter a user id to create or load your personal tracker. (Future: Google / OAuth can be added here.)</p>

            <input
              type="text"
              placeholder="username or email"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleLoginModalConfirm(userId)}
            />

            <div className="flex gap-2">
              <button onClick={() => handleLoginModalConfirm(userId)} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg">Continue</button>
              <button onClick={() => setShowLoginModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg">Cancel</button>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              <p>Future integrations:</p>
              <ul className="list-disc ml-5">
                <li>Google / OAuth — map provider user ID to <code>userId</code></li>
                <li>Supabase / MongoDB — store/retrieve habits & sleep per user</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <div className="max-w-6xl mx-auto">
        {/* If not logged in: show About section */}
        {!isLoggedIn ? (
          <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl shadow-lg p-6 sm:p-8 border border-indigo-100 mb-6 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full opacity-20 blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-100 rounded-full opacity-20 blur-3xl -ml-24 -mb-24"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium mb-3">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    Privacy-First Tracking
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                    Build Better Habits, One Day at a Time
                  </h2>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    A minimalist tracker designed for consistency. No accounts needed—just pick a username and start building streaks that matter.
                  </p>
                  
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="flex items-start gap-3 bg-white bg-opacity-60 backdrop-blur-sm p-3 rounded-lg border border-indigo-100">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-600 text-lg">🎯</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">Daily Habits</p>
                        <p className="text-xs text-gray-600">Track & build streaks</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 bg-white bg-opacity-60 backdrop-blur-sm p-3 rounded-lg border border-purple-100">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-600 text-lg">😴</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">Sleep Logging</p>
                        <p className="text-xs text-gray-600">Hours & quality</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 bg-white bg-opacity-60 backdrop-blur-sm p-3 rounded-lg border border-indigo-100">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-600 text-lg">📊</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">30-Day Trends</p>
                        <p className="text-xs text-gray-600">Visual insights</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:min-w-[180px]">
                  <button 
                    onClick={() => setShowLoginModal(true)} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    Get Started →
                  </button>
                  <button 
                    onClick={() => setShowVisualization(true)} 
                    className="bg-white hover:bg-gray-50 border-2 border-gray-200 px-6 py-3 rounded-xl font-semibold text-gray-700 transition-all duration-200 hover:border-indigo-200"
                  >
                    Preview Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* If logged in: show the tracker UI */}
        {isLoggedIn && (
          <>
            {/* Header controls (desktop/mobile adjusted) */}
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

            {/* Visualization Section */}
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

                {sleepData.length > 0 && (
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
                        {habits.slice(0, 3).map((habit) => (
                          <Bar key={habit.id} dataKey={habit.name} fill={habit.color} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Stats & Sleep & Habits (same UI as before) */}
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
                    <p className="text-lg sm:text-3xl font-bold text-purple-600">{totalStreak}</p>
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
                    <p className="text-lg sm:text-3xl font-bold text-green-600">{habits.length}</p>
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

              {getTodaySleep() ? (
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

              {habits.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No habits yet. Add your first habit to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {habits.map(habit => (
                    <div key={habit.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                          <h3 className="font-semibold text-gray-800 truncate">{habit.name}</h3>
                          <span className="text-sm text-gray-500 whitespace-nowrap">{habit.streak}🔥</span>
                        </div>
                        <button onClick={() => deleteHabit(habit.id)} className="text-gray-400 hover:text-red-500 ml-2"><X className="w-5 h-5" /></button>
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {getLast7Days().map((date, idx) => {
                          const dateString = getDateString(date);
                          const isCompleted = habit.completed.includes(dateString);
                          const isToday = dateString === getTodayString();

                          return (
                            <button key={idx} onClick={() => isToday && toggleHabit(habit.id)} disabled={!isToday} className={`py-3 rounded-lg border-2 transition text-center ${isCompleted ? 'border-transparent' : 'border-gray-200 bg-white'} ${isToday ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-60'}`} style={{ backgroundColor: isCompleted ? habit.color : undefined, color: isCompleted ? 'white' : undefined }} aria-pressed={isCompleted}>
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
      
      </div>
      
      
    </div>
    
  );
}
