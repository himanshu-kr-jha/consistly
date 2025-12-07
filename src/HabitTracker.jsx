// HabitTracker.jsx (updated)
import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, TrendingUp, Award, Plus, X, Check, Moon,
  BarChart3, User, LogIn, LogOut, Info, Menu, Sparkles, Pin,
} from 'lucide-react';
import {
  LineChart as RechartsLine, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { setAuthToken, getAuthToken, authFetch } from './api';
import StickyNote from './StickyNotes';

import newFeatures from './newfeatures';

// Toast JSX (place at the top of your return/render)
// localStorage polyfill (unchanged)
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
function Avatar({ src, seed, size = 40 }) {
  if (src) {
    return <img src={src} alt="avatar" className="rounded-xl" style={{ width: size, height: size, objectFit: 'cover' }} />;
  }
  // fallback generated avatar (gradient circle with initials)
  const hue = (typeof seed === 'number' ? seed : String(seed || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % 360;
  const initials = (String(seed || 'HB').slice(0, 2) || 'HB').toUpperCase();
  const style = {
    width: size,
    height: size,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    color: '#fff',
    background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))`
  };
  return <div style={style}>{initials}</div>;
}

export function Leaderboard({ currentUserId, initialLimit = 20 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(initialLimit);
  const [page, setPage] = useState(1);
  const [windowDays, setWindowDays] = useState(30);
  const [totalFetched, setTotalFetched] = useState(0);
  const [error, setError] = useState(null);
  const [userPosition, setUserPosition] = useState(null);

  const load = async (opts = {}) => {
    try {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams({
        limit: String(opts.limit ?? limit),
        page: String(opts.page ?? page),
        windowDays: String(opts.windowDays ?? windowDays)
      });
      const resp = await authFetch(`/api/leaderboard?${q.toString()}`, { method: 'GET' });
      if (!resp) throw new Error('No response');

      const data = resp.data ?? resp?.entries ?? resp;
      setRows(Array.isArray(data) ? data : []);
      setTotalFetched(Array.isArray(data) ? data.length : 0);

      // Try to fetch user's position if not in current page
      if (currentUserId && Array.isArray(data)) {
        const userInPage = data.find(r => String(r.userId) === String(currentUserId));
        if (userInPage) {
          const rank = data.indexOf(userInPage) + 1 + (opts.page ?? page - 1) * (opts.limit ?? limit);
          setUserPosition({ ...userInPage, rank });
        } else {
          // Fetch user's actual position separately if API supports it
          try {
            const userResp = await authFetch(`/api/leaderboard/user?windowDays=${opts.windowDays ?? windowDays}`, { method: 'GET' });
            if (userResp && userResp.rank) {
              setUserPosition(userResp);
            }
          } catch (e) {
            setUserPosition(null);
          }
        }
      }
    } catch (err) {
      console.error('Leaderboard load error', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ limit, page, windowDays });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, page, windowDays]);

  const rerenderPage = (p) => {
    setPage(p);
    load({ limit, page: p, windowDays });
  };

  const youIndex = rows.findIndex(r => String(r.userId) === String(currentUserId));
  const isUserOnPage = youIndex !== -1;

  const getRankBadge = (rank) => {
    if (rank === 1) return { emoji: '🏆', color: 'from-yellow-400 to-yellow-600', text: 'text-yellow-900' };
    if (rank === 2) return { emoji: '🥈', color: 'from-gray-300 to-gray-500', text: 'text-gray-900' };
    if (rank === 3) return { emoji: '🥉', color: 'from-orange-400 to-orange-600', text: 'text-orange-900' };
    return { emoji: null, color: 'from-gray-100 to-gray-200', text: 'text-gray-700' };
  };

  return (
    <div className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-3xl shadow-2xl p-6 sm:p-8 border border-indigo-100/50 hover:shadow-3xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Leaderboard</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Top performers • Last {windowDays} day{windowDays > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={windowDays}
            onChange={(e) => { setWindowDays(Number(e.target.value)); setPage(1); }}
            className="text-sm border-2 border-gray-200 rounded-xl px-4 py-2 bg-white font-medium hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
            aria-label="Time window"
          >
            <option value={1}>📅 Today</option>
            <option value={7}>📊 This Week</option>
            <option value={30}>📈 This Month</option>
          </select>

          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="text-sm border-2 border-gray-200 rounded-xl px-4 py-2 bg-white font-medium hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
            aria-label="Rows per page"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Loading rankings...</p>
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 font-semibold mb-2">Oops! Something went wrong</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-2">No rankings yet</p>
          <p className="text-sm text-gray-500">Start tracking habits to appear on the leaderboard!</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {rows.map((row, idx) => {
              const rank = (page - 1) * limit + idx + 1;
              const displayName = row.anonymous && row.anonymous.showOnLeaderboard && row.anonymous.displayId
                ? row.anonymous.displayId
                : row.name || `User ${rank}`;
              const isYou = String(row.userId) === String(currentUserId);
              const badge = getRankBadge(rank);

              return (
                <div
                  key={row.userId}
                  className={`flex items-center gap-3 sm:gap-4 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${isYou
                      ? 'bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 border-indigo-300 shadow-lg ring-2 ring-indigo-400/50'
                      : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-md'
                    }`}
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center font-bold text-lg sm:text-xl shadow-md ${badge.text}`}>
                    {badge.emoji || `#${rank}`}
                  </div>

                  <Avatar 
  src={row.anonymous && row.anonymous.showOnLeaderboard && row.anonymous.displayId ? null : row.picture} 
  seed={row.userId} 
  size={48} 
/>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-bold text-gray-900 truncate text-sm sm:text-base">
                        {displayName}
                      </div>
                      {isYou && (
                        <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">YOU</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className="text-orange-500">🔥</span>
                        {row.currentStreak ?? 0} streak
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {row.habitCount ?? 0} habits
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                      {(row.finalScore ?? row.final_score ?? 0).toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">points</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t-2 border-gray-200">
            <div className="text-sm text-gray-600 font-medium">
              Showing {(page - 1) * limit + 1}–{(page - 1) * limit + rows.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { if (page > 1) rerenderPage(page - 1); }}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-medium hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                ← Prev
              </button>
              <div className="px-4 py-2 rounded-xl border-2 border-indigo-500 bg-indigo-50 font-bold text-indigo-700">
                {page}
              </div>
              <button
                onClick={() => { if (rows.length === limit) rerenderPage(page + 1); }}
                disabled={rows.length < limit}
                className="px-4 py-2 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-medium hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Your Position (when not on page) */}
          {!isUserOnPage && userPosition && currentUserId && (
            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 border-2 border-indigo-300 shadow-lg animate-in slide-in-from-bottom duration-500">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-indigo-600" />
                <p className="text-sm font-bold text-indigo-900">Your Position</p>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-indigo-200">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg shadow-md">
                  #{userPosition.rank}
                </div>

                <Avatar 
  src={userPosition.anonymous && userPosition.anonymous.showOnLeaderboard && userPosition.anonymous.displayId ? null : userPosition.picture} 
  seed={currentUserId} 
  size={44} 
/>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 truncate text-sm sm:text-base mb-1">
                    {userPosition.name || 'You'}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      🔥 {userPosition.currentStreak ?? 0} streak
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {userPosition.habitCount ?? 0} habits
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                    {(userPosition.finalScore ?? userPosition.final_score ?? 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">points</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


export default function HabitTracker() {
  // IMPORTANT: Include protocol so redirects like /auth/google work correctly
  // const BACKEND_URL = 'http://localhost:4000'; // <-- changed (was 'localhost:4000')
  const BACKEND_URL = 'https://api-logdaily-com.onrender.com'; // <-- changed (was 'logdaily.com/api')
  const SYNC_QUEUE_KEY = 'ld_sync_queue_v1';
  const SYNC_INTERVAL_MS = 15000;

  const [userId, setUserId] = useState('');
  const [username, setUserName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // habitsDefs expects local shape { id: habitId, name, color, createdAt, days? }
  const [habitsDefs, setHabitsDefs] = useState([]);
  const [entries, setEntries] = useState([]);
  const [todayEntry, setTodayEntry] = useState({
    date: getTodayString(),
    completedHabits: [],
    sleep: { hours: null, quality: null }
  });

  // UI State unchanged
  // credits for local-only users (default 6)
  const [credits, setCredits] = useState(3);

  const STICKY_KEY = 'ld_sticky_note_v1';
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  const WHATS_NEW_VERSION = 'v1.2.1'; // Update this when you add new features
  const WHATS_NEW_KEY = 'ld_whats_new_seen';


  // show when user is out of credits and tries to add/update
  const [showOutOfCreditsModal, setShowOutOfCreditsModal] = useState(false);

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
  const [showToast, setShowToast] = useState(true);
  const [actionToastVisible, setActionToastVisible] = useState(false);
  const [actionToastMessage, setActionToastMessage] = useState('');
  const [actionToastType, setActionToastType] = useState('success');
  const [toastFading, setToastFading] = useState(false);
  const toastHideTimers = React.useRef({ fadeTimer: null, hideTimer: null });
  // local-only username flow
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  // Edit-habit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editHabitId, setEditHabitId] = useState(null);
  const [editHabitName, setEditHabitName] = useState('');
  const [editHabitColor, setEditHabitColor] = useState(selectedColor);

  // prefix for localStorage keys for local-only users
  const LOCAL_PREFIX = 'ld_local_user_'; // full key: ld_local_user_<username>


  const colors = ['#6366f1', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

  const initialLoadRef = useRef(true);
  const habitsSaveTimer = useRef(null);
  const queueRef = useRef([]);
  const flushingRef = useRef(false);
  const syncIntervalRef = useRef(null);
  // Timezone handling
  const TZ_STORAGE_KEY = 'ld_tz_v1';
  const detectedTz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
  const [userTimezone, setUserTimezone] = useState(() => {
    try {
      const saved = localStorage.getItem(TZ_STORAGE_KEY);
      return saved || detectedTz || 'UTC';
    } catch (e) {
      return detectedTz || 'UTC';
    }
  });
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  // helpful flag so we show modal only when user hasn't explicitly chosen TZ
  const tzConfirmedRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [anonymousSettings, setAnonymousSettings] = useState({
    showOnLeaderboard: true,
    displayId: null
  });

  useEffect(() => {
    // If user hasn't confirmed timezone before, show modal once on load
    try {
      const saved = localStorage.getItem(TZ_STORAGE_KEY);
      if (!saved) {
        setShowTimezoneModal(true);
      } else {
        tzConfirmedRef.current = true;
      }
    } catch (e) {
      // fallback: do nothing
    }
    // Check if user has seen the latest "What's New"
    try {
      const seenVersion = localStorage.getItem(WHATS_NEW_KEY);
      if (seenVersion !== WHATS_NEW_VERSION) {
        // Show after a short delay so it doesn't conflict with other modals
        setTimeout(() => setShowWhatsNew(true), 1500);
      }
    } catch (e) {
      // fallback: do nothing
    }
  }, []);


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
            // Load habits (from Habit collection) and entries separately
            await loadUserData(); // will call both endpoints
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
          await loadUserData();
        } catch (err) {
          console.error('Failed to fetch user data', err);
          setAuthToken(null);
          setIsLoggedIn(false);
        } finally {
          initialLoadRef.current = false;
        }
      })();
    } else {
      initialLoadRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!showToast) {
      setToastFading(false);
      if (toastHideTimers.current.fadeTimer) {
        clearTimeout(toastHideTimers.current.fadeTimer);
        toastHideTimers.current.fadeTimer = null;
      }
      if (toastHideTimers.current.hideTimer) {
        clearTimeout(toastHideTimers.current.hideTimer);
        toastHideTimers.current.hideTimer = null;
      }
      return;
    }

    toastHideTimers.current.fadeTimer = setTimeout(() => {
      setToastFading(true);
      toastHideTimers.current.fadeTimer = null;
    }, 2600);

    toastHideTimers.current.hideTimer = setTimeout(() => {
      setShowToast(false);
      toastHideTimers.current.hideTimer = null;
      setToastFading(false);
    }, 3000);

    return () => {
      if (toastHideTimers.current.fadeTimer) {
        clearTimeout(toastHideTimers.current.fadeTimer);
        toastHideTimers.current.fadeTimer = null;
      }
      if (toastHideTimers.current.hideTimer) {
        clearTimeout(toastHideTimers.current.hideTimer);
        toastHideTimers.current.hideTimer = null;
      }
    };
  }, [showToast]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoggedIn) loadUserData();
    // start periodic flush
    if (!syncIntervalRef.current) {
      syncIntervalRef.current = setInterval(() => flushQueue(), SYNC_INTERVAL_MS);
    }
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isLoggedIn]);

  // Persist to localStorage automatically for username-only users (and save credits)
  useEffect(() => {
    if (!isLocalOnly || !userId) return;
    // Save a minimal snapshot whenever habits/entries/todayEntry/credits change
    saveLocalUserData(userId, { habits: habitsDefs, entries, todayEntry, credits });
    // friendly feedback (only when change is user-initiated)
    showSaveStatus('✓ Changes saved locally', 'success');
  }, [isLocalOnly, userId, habitsDefs, entries, todayEntry, credits]);


  // IMPORTANT: only save habitsDefs (debounced). Entry updates are atomic diffs.
  useEffect(() => {
    if (!isLoggedIn) return;
    if (initialLoadRef.current) return;

    if (habitsSaveTimer.current) clearTimeout(habitsSaveTimer.current);
    habitsSaveTimer.current = setTimeout(async () => {
      try {
        // Prefer creating/updating via server endpoints — but if you want to keep a full-replace flow:
        // We'll do nothing here to avoid confusing server's authoritative Habit collection.
        // Instead, use addHabit/deleteHabit routines that call /api/habits.
        showSaveStatus('✓ Habits updated locally', 'success');
      } catch (err) {
        console.error('Error saving habits', err);
        showSaveStatus('⚠ Save failed', 'error');
      }
    }, 400);

    return () => {
      if (habitsSaveTimer.current) {
        clearTimeout(habitsSaveTimer.current);
        habitsSaveTimer.current = null;
      }
    };
  }, [habitsDefs, isLoggedIn]);

  useEffect(() => {
    try {
      localStorage.setItem(TZ_STORAGE_KEY, userTimezone);
    } catch (e) { /* ignore */ }
    // re-calc today/todayEntry and chart data if necessary
    // If entries are stored with plain 'YYYY-MM-DD' keys, they still match.
    // Force a UI refresh by updating todayEntry from entries (prefer server's today entry if present)
    const t = entries.find(e => e.date === getTodayString());
    if (t) setTodayEntry(t);
  }, [userTimezone]);

  // Local storage helpers for username-only users
  const localKeyFor = (username) => `${LOCAL_PREFIX}${encodeURIComponent(username)}`;
  const saveTimezone = (tz) => {
    try {
      localStorage.setItem(TZ_STORAGE_KEY, tz);
      setUserTimezone(tz);
      tzConfirmedRef.current = true;
      setShowTimezoneModal(false);
      showSaveStatus('✓ Timezone saved', 'success');
    } catch (e) {
      console.error('saveTimezone error', e);
      showSaveStatus('⚠ Could not save timezone', 'error');
    }
  };

  const dismissWhatsNew = () => {
    try {
      localStorage.setItem(WHATS_NEW_KEY, WHATS_NEW_VERSION);
      setShowWhatsNew(false);
    } catch (e) {
      setShowWhatsNew(false);
    }
  };
  const loadLocalUserData = (username) => {
    try {
      const key = localKeyFor(username);
      const raw = localStorage.getItem(key);
      if (!raw) {
        // return sensible defaults
        return {
          habits: [],
          entries: [],
          todayEntry: { date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } },
          credits: 3
        };
      }
      const parsed = JSON.parse(raw);
      return {
        habits: Array.isArray(parsed.habits) ? parsed.habits : [],
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
        todayEntry: parsed.todayEntry || { date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } },
        credits: typeof parsed.credits === 'number' ? parsed.credits : 6
      };
    } catch (err) {
      console.error('loadLocalUserData error', err);
      return {
        habits: [],
        entries: [],
        todayEntry: { date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } },
        credits: 6
      };
    }
  };

  const saveLocalUserData = (username, { habits, entries, todayEntry, credits: cred }) => {
    try {
      const key = localKeyFor(username);
      const payload = {
        habits: habits || [],
        entries: entries || [],
        todayEntry: todayEntry || { date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } },
        credits: typeof cred === 'number' ? cred : (typeof credits === 'number' ? credits : 6),
        clientSavedAt: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (err) {
      console.error('saveLocalUserData error', err);
    }
  };


  const handleLoginModalConfirm = (id) => {
    if (id && id.trim()) {
      const uname = id.trim();
      setUserId(uname);
      setIsLoggedIn(true);

      // If there is NOT an auth token, treat this as a local-only user
      // (username-only "Get started" flow).
      const existingToken = getAuthToken();
      if (!existingToken) {
        setIsLocalOnly(true);
        // load user data from localStorage based on username
        const local = loadLocalUserData(uname);
        setHabitsDefs(local.habits || []);
        setEntries(local.entries || []);
        setTodayEntry(local.todayEntry || { date: getTodayString(), completedHabits: [], sleep: { hours: null, quality: null } });
        setCredits(typeof local.credits === 'number' ? local.credits : 6);
        showSaveStatus('✓ Loaded local profile', 'success');
        setShowLoginModal(false);
        initialLoadRef.current = false;
        return;
      }

      // otherwise proceed with server-backed user flow
      setIsLocalOnly(false);
      setShowLoginModal(false);
    }
  };


  /* ---------------------------
    SYNC QUEUE UTILITIES (unchanged logic)
  ----------------------------*/
  const loadQueueFromStorage = () => {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      if (!raw) {
        queueRef.current = [];
        return [];
      }
      const parsed = JSON.parse(raw);
      queueRef.current = Array.isArray(parsed) ? parsed : [];
      return queueRef.current;
    } catch (e) {
      console.error('Failed to load sync queue from storage', e);
      queueRef.current = [];
      return [];
    }
  };

  const persistQueueToStorage = () => {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queueRef.current));
    } catch (e) {
      console.error('Failed to persist sync queue', e);
    }
  };

  const enqueueEntryDiff = (payload) => {
    const minimal = { date: payload.date };
    if (Object.prototype.hasOwnProperty.call(payload, 'completedHabits')) minimal.completedHabits = payload.completedHabits;
    if (Object.prototype.hasOwnProperty.call(payload, 'sleep')) minimal.sleep = payload.sleep;
    if (Object.prototype.hasOwnProperty.call(payload, 'habitDiff')) minimal.habitDiff = payload.habitDiff;
    minimal.clientGeneratedAt = new Date().toISOString();

    queueRef.current.push(minimal);
    persistQueueToStorage();
    console.log('[SYNC] Queue ENQUEUED:', minimal, 'queueLen=', queueRef.current.length);
  };

  const flushQueue = async () => {
    if (!isLoggedIn) {
      console.log('[SYNC] flushQueue: user not logged in — skipping');
      return;
    }
    if (flushingRef.current) return;
    loadQueueFromStorage();
    if (!queueRef.current.length) return;

    flushingRef.current = true;
    console.log('[SYNC] flushQueue: starting — items=', queueRef.current.length);

    while (queueRef.current.length) {
      let item = queueRef.current[0];

      const hasCompleted = Object.prototype.hasOwnProperty.call(item, 'completedHabits');
      const hasSleep = Object.prototype.hasOwnProperty.call(item, 'sleep');
      const hasHabitDiff = Object.prototype.hasOwnProperty.call(item, 'habitDiff');

      if (!hasCompleted && !hasSleep && !hasHabitDiff) {
        const localEntry = (entries.find(e => e.date === item.date) || (todayEntry && todayEntry.date === item.date ? todayEntry : null));
        if (localEntry) {
          const enriched = { date: item.date };
          if (Array.isArray(localEntry.completedHabits)) enriched.completedHabits = localEntry.completedHabits;
          if (localEntry.sleep && (localEntry.sleep.hours != null || localEntry.sleep.quality != null)) enriched.sleep = localEntry.sleep;
          if (Object.prototype.hasOwnProperty.call(enriched, 'completedHabits') || Object.prototype.hasOwnProperty.call(enriched, 'sleep')) {
            enriched.clientGeneratedAt = item.clientGeneratedAt || new Date().toISOString();
            item = enriched;
          } else {
            console.warn('[SYNC] dropping item with no useful data', queueRef.current[0]);
            queueRef.current.shift();
            persistQueueToStorage();
            continue;
          }
        } else {
          console.warn('[SYNC] dropping item with no local entry', queueRef.current[0]);
          queueRef.current.shift();
          persistQueueToStorage();
          continue;
        }
      }

      try {
        console.log('[SYNC] Sending to server:', item);
        await authFetch('/api/user/data', {
          method: 'POST',
          body: JSON.stringify(item)
        });
        console.log('[SYNC] flushed item:', item.date);
        queueRef.current.shift();
        persistQueueToStorage();
      } catch (err) {
        console.error('[SYNC] failed to sync item', queueRef.current[0], err);
        break;
      }
    }

    flushingRef.current = false;
    console.log('[SYNC] flushQueue: finished — remaining=', queueRef.current.length);
  };

  const scheduleFlush = (delay = 0) => {
    setTimeout(() => flushQueue(), delay);
  };

  const saveEntryToServer = async (entry) => {
    try {
      const payload = { date: entry.date };
      if (entry.completedHabits !== undefined) payload.completedHabits = entry.completedHabits;
      if (entry.sleep !== undefined) payload.sleep = entry.sleep;
      if (entry.habitDiff !== undefined) payload.habitDiff = entry.habitDiff;

      // if local-only user -> persist immediately to localStorage and avoid network queue
      if (isLocalOnly && userId) {
        // apply habitDiff if provided to the local entries/todayEntry
        const today = entry.date;
        let updatedEntry = entries.find(e => e.date === today) || (todayEntry && todayEntry.date === today ? todayEntry : { date: today, completedHabits: [], sleep: { hours: null, quality: null } });

        if (payload.habitDiff) {
          const { id, type } = payload.habitDiff;
          if (type === 'add') {
            updatedEntry.completedHabits = Array.from(new Set([...(updatedEntry.completedHabits || []), id]));
          } else if (type === 'remove') {
            updatedEntry.completedHabits = (updatedEntry.completedHabits || []).filter(x => x !== id);
          }
        }
        if (payload.completedHabits !== undefined) {
          updatedEntry.completedHabits = payload.completedHabits;
        }
        if (payload.sleep !== undefined) {
          updatedEntry.sleep = payload.sleep;
        }

        // update entries and todayEntry in local state
        setTodayEntry(updatedEntry);
        setEntries(prev => {
          const filtered = prev.filter(e => e.date !== today);
          return [...filtered, updatedEntry];
        });

        // persist full snapshot for username
        saveLocalUserData(userId, { habits: habitsDefs, entries: (entries.filter(e => e.date !== today)).concat([updatedEntry]), todayEntry: updatedEntry });
        showSaveStatus('✓ Saved (local)', 'success');
        return;
      }

      // existing server flow for authenticated users:
      if (payload.completedHabits === undefined && payload.sleep === undefined && payload.habitDiff === undefined) {
        const localEntry = (entries.find(e => e.date === entry.date) || (todayEntry && todayEntry.date === entry.date ? todayEntry : null));
        if (localEntry) {
          if (Array.isArray(localEntry.completedHabits)) payload.completedHabits = localEntry.completedHabits;
          if (localEntry.sleep && (localEntry.sleep.hours != null || localEntry.sleep.quality != null)) payload.sleep = localEntry.sleep;
        }
      }

      if (payload.completedHabits === undefined && payload.sleep === undefined && payload.habitDiff === undefined) {
        console.warn('[SAVE] No diff to send for', entry.date);
        return;
      }

      enqueueEntryDiff(payload);
      scheduleFlush(50);
      showSaveStatus('✓ Saved', 'success');
    } catch (err) {
      console.error('Save failed (queued)', err);
      showSaveStatus('⚠ Save queued', 'error');
    }
  };


  /* ---------------------------
    Data operations (updated to use /api/user/data-extended and /api/user/data)
  ----------------------------*/
  const loadUserData = async () => {
    try {
      // 1) load authoritative habit defs (Habit collection)
      let extended = null;
      try {
        extended = await authFetch('/api/user/data-extended', { method: 'GET' });
        // extended.habits is an array of { habitId, name, color, createdAt, days }
        if (Array.isArray(extended.habits)) {
          // normalize to local habit shape: use id = habitId
          const normalized = extended.habits.map(h => ({
            id: h.habitId,
            name: h.name,
            color: h.color || '#6366f1',
            createdAt: h.createdAt,
            days: h.days || {}
          }));
          setHabitsDefs(normalized);
        } else {
          setHabitsDefs([]);
        }
        if (extended.userInfo) {
          setUserName(extended.userInfo.name || '');
          setUserId(extended.userInfo.email || '');
        }
        // Inside loadUserData function, after setUserName/setUserId
        if (extended && extended.userInfo && extended.userInfo.anonymous) {
          setAnonymousSettings(extended.userInfo.anonymous);
        } else if (data.userInfo && data.userInfo.anonymous) {
          setAnonymousSettings(data.userInfo.anonymous);
        }
      } catch (err) {
        // fall back to legacy endpoint if extended fails
        console.warn('Failed to load extended habits view, falling back to /api/user/data', err);
      }

      // 2) load entries (authoritative for per-date Entry docs). /api/user/data returns merged entries
      try {
        const data = await authFetch('/api/user/data', { method: 'GET' });
        // server returns { habits, entries, userInfo }
        // entries is an array of { date, completedHabits, sleep, updatedAt }
        setEntries(Array.isArray(data.entries) ? data.entries : []);
        // todayEntry: prefer any explicit todayEntry returned by server (if present)
        const t = data.entries && data.entries.find(e => e.date === getTodayString());
        if (t) setTodayEntry(t);
        if (!extended && data.habits && Array.isArray(data.habits)) {
          // fallback: normalize legacy user.habits to local shape if extended not available
          const normalized = data.habits.map(h => ({
            id: h.id || h.habitId || String(h.id || Math.random()),
            name: h.name,
            color: h.color || '#6366f1',
            createdAt: h.createdAt || null
          }));
          setHabitsDefs(normalized);
        }
        if (data.userInfo) {
          setUserName(data.userInfo.name || '');
          setUserId(data.userInfo.email || '');
        }
      } catch (err) {
        console.error('Error loading entries from /api/user/data', err);
      }

      showSaveStatus('✓ Data loaded', 'success');
      // after loading, try to flush queued diffs
      scheduleFlush(200);
    } catch (err) {
      console.error('Error loading data:', err);
      showSaveStatus('⚠ Load failed', 'error');
    } finally {
      initialLoadRef.current = false;
    }
  };

  const saveUserData = async () => {
    try {
      // Keep this if you need to full-replace both (rare). Prefer using addHabit/deleteHabit for habits.
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

  const showSaveStatus = (message, type = 'success') => {
    setSaveStatus(message);
    setTimeout(() => setSaveStatus(''), type === 'success' ? 1200 : 2000);

    if (type === 'success') {
      let friendly = 'Keep it up — your data was saved!';
      if (message.toLowerCase().includes('habit added')) friendly = 'Nice — habit added and saved!';
      else if (message.toLowerCase().includes('habit removed')) friendly = 'Habit removed — changes saved.';
      else if (message.toLowerCase().includes('data loaded')) friendly = 'Data loaded successfully.';
      else if (message.toLowerCase().includes('saved') || message.startsWith('✓')) friendly = 'Keep it up — your data was saved!';

      setActionToastMessage(friendly);
      setActionToastType('success');
      setActionToastVisible(true);
      setTimeout(() => setActionToastVisible(false), 2500);
    } else {
      setActionToastMessage(message || 'Something went wrong');
      setActionToastType('error');
      setActionToastVisible(true);
      setTimeout(() => setActionToastVisible(false), 3500);
    }
  };

  /* ---------------------------
    Auth helpers (update login URL usage)
  ----------------------------*/
  // const handleLoginModalConfirm = (id) => {
  //   if (id && id.trim()) {
  //     setUserId(id.trim());
  //     setIsLoggedIn(true);
  //     setShowLoginModal(false);
  //   }
  // };
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
    Date helpers (unchanged)
  ----------------------------*/
  // Return ISO yyyy-mm-dd for current "day" in the selected timezone
  function getTodayString() {
    try {
      // 'en-CA' gives 'YYYY-MM-DD' in most engines
      return new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone }).format(new Date());
    } catch (e) {
      // fallback to local ISO
      return new Date().toISOString().split('T')[0];
    }
  }


  function isDateLocked(dateString) {
    return dateString !== getTodayString();
  }

  /* ---------------------------
    Habit operations (updated to call new endpoints)
  ----------------------------*/
  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString();
    const newDef = { id, name: newHabitName.trim(), color: selectedColor, createdAt: new Date() };

    // Optimistically update UI
    setHabitsDefs(prev => [...prev, newDef]);
    setNewHabitName('');
    setShowAddHabit(false);

    // Create on server via POST /api/habits
    try {
      if (isLocalOnly) {
        // check credits
        if (typeof credits !== 'number' || credits <= 0) {
          // no credits — show upgrade popup
          setShowOutOfCreditsModal(true);
          // revert optimistic UI change
          setHabitsDefs(prev => prev.filter(h => h.id !== id));
          return;
        }

        // deduct a credit (optimistic)
        setCredits(prev => {
          const next = (typeof prev === 'number' ? prev : 6) - 1;
          // persist after state update by using next
          saveLocalUserData(userId, { habits: [...(habitsDefs || []), newDef], entries, todayEntry, credits: next });
          return next;
        });

        showSaveStatus('✓ Habit added (local)', 'success');
      } else {
        const payload = { habitId: id, name: newDef.name, color: newDef.color };
        const resp = await authFetch('/api/habits', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        await refreshHabitsFromServer();
        showSaveStatus('✓ Habit added', 'success');
      }
    } catch (err) {
      console.error('Failed to create habit', err);
      setHabitsDefs(prev => prev.filter(h => h.id !== id));
      showSaveStatus('⚠ Save failed', 'error');
    }
  };

  const openEditHabit = (habit) => {
    setEditHabitId(habit.id);
    setEditHabitName(habit.name);
    setEditHabitColor(habit.color || selectedColor);
    setShowEditModal(true);
  };

  const saveEditHabit = async () => {
    if (!editHabitId) return;

    // local-only credit check
    if (isLocalOnly) {
      if (typeof credits !== 'number' || credits <= 0) {
        setShowOutOfCreditsModal(true);
        return;
      }
      // deduct credit
      setCredits(prev => {
        const next = (typeof prev === 'number' ? prev : 6) - 1;
        // update and persist
        setHabitsDefs(prevDefs => {
          const updated = prevDefs.map(h => h.id === editHabitId ? { ...h, name: editHabitName, color: editHabitColor } : h);
          saveLocalUserData(userId, { habits: updated, entries, todayEntry, credits: next });
          return updated;
        });
        return next;
      });
      showSaveStatus('✓ Habit updated (local)', 'success');
      setShowEditModal(false);
      return;
    }

    // server user: call update endpoint if available (or do optimistic local change + refresh)
    try {
      // if your server has an endpoint like /api/habits/:id (PATCH), use it:
      await authFetch(`/api/habits/${editHabitId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editHabitName, color: editHabitColor })
      });
      await refreshHabitsFromServer();
      showSaveStatus('✓ Habit updated', 'success');
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update habit on server', err);
      showSaveStatus('⚠ Update failed', 'error');
    }
  };

  // Refresh habit defs from /api/user/data-extended
  const refreshHabitsFromServer = async () => {
    try {
      const extended = await authFetch('/api/user/data-extended', { method: 'GET' });
      if (extended && Array.isArray(extended.habits)) {
        const normalized = extended.habits.map(h => ({
          id: h.habitId,
          name: h.name,
          color: h.color || '#6366f1',
          createdAt: h.createdAt,
          days: h.days || {}
        }));
        setHabitsDefs(normalized);
      }
      if (extended && extended.userInfo) {
        setUserName(extended.userInfo.name || '');
        setUserId(extended.userInfo.email || '');
      }
    } catch (err) {
      console.error('Failed to refresh habits from server', err);
    }
  };

  const deleteHabit = async (habitId) => {
    // Optimistically remove locally
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
      saveEntryToServer(updatedToday);
    }

    try {
      if (isLocalOnly) {
        // already removed from local state; persist
        saveLocalUserData(userId, { habits: updatedDefs, entries: updatedEntries, todayEntry: todayEntry });
        showSaveStatus('✓ Habit removed (local)', 'success');
      } else {
        await authFetch(`/api/habits/${habitId}`, { method: 'DELETE' });
        await refreshHabitsFromServer();
        showSaveStatus('✓ Habit removed', 'success');
      }
    } catch (err) {
      console.error('Failed to delete habit', err);
      if (isLocalOnly) {
        // best-effort: still persist to local storage
        saveLocalUserData(userId, { habits: updatedDefs, entries: updatedEntries, todayEntry: todayEntry });
      } else {
        await refreshHabitsFromServer();
      }
      showSaveStatus('⚠ Delete failed', 'error');
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

    // Send the atomic diff (server accepts habitDiff)
    saveEntryToServer({
      date: updated.date,
      habitDiff: {
        id: habitId,
        type: isCompleted ? 'remove' : 'add'
      }
    });
  };

  /* ---------------------------
    Sleep operations (unchanged except using saveEntryToServer diffs)
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
    saveEntryToServer({ date: updated.date, sleep: updated.sleep });
  };

  /* ---------------------------
    Analytics helpers (unchanged)
  ----------------------------*/
  const buildBaseDateFromTodayString = (isoDateStr) => {
    // isoDateStr is 'YYYY-MM-DD' -> create a Date at local midnight (safe canonical)
    // using new Date(`${isoDateStr}T00:00:00`) is fine for our usage (we only need day increments)
    return new Date(`${isoDateStr}T00:00:00`);
  };

  const getLast7Days = () => {
    const days = [];
    const baseIso = getTodayString(); // timezone-correct today
    const base = buildBaseDateFromTodayString(baseIso);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      days.push(d);
    }
    return days;
  };

  const getLast30Days = () => {
    const days = [];
    const baseIso = getTodayString();
    const base = buildBaseDateFromTodayString(baseIso);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      days.push(d);
    }
    return days;
  };


  // Convert a Date object to yyyy-mm-dd (in the timezone of userTimezone)
  const getDateString = (date) => {
    try {
      // Create a string 'YYYY-MM-DD' for the given date in the user's timezone
      return new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone }).format(date);
    } catch (e) {
      return date.toISOString().split('T')[0];
    }
  };

  // Friendly label for charts (month short + day)
  const formatDate = (date) => {
    try {
      return new Date(new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone }).format(date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };


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
    JSX Render (kept mostly unchanged; auth links updated to use BACKEND_URL)
  ----------------------------*/

  return (


    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <StickyNote userId={userId} isLoggedIn={isLoggedIn} corner="bottom-right" />
      {/* Dismissible Toast for Free Tier Notice */}
      {showToast && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] w-full max-w-md px-4 transition-all duration-500`}
          role="status"
          aria-live="polite"
        >
          <div
            className={`bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 border border-blue-400/50
        ${toastFading ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}
        transition-all duration-500`}
          >
            <div className="flex-shrink-0 mt-0.5">
              <Info className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm mb-1">Backend on Free Tier</p>
              <p className="text-xs text-blue-50 leading-relaxed">
                Users logging in via Google may face a brief 30–60 second delay as our backend initializes on free hosting. We appreciate your patience!
              </p>
            </div>
            <button
              onClick={() => {
                if (toastHideTimers.current.fadeTimer) {
                  clearTimeout(toastHideTimers.current.fadeTimer);
                  toastHideTimers.current.fadeTimer = null;
                }
                if (toastHideTimers.current.hideTimer) {
                  clearTimeout(toastHideTimers.current.hideTimer);
                  toastHideTimers.current.hideTimer = null;
                }
                setToastFading(false);
                setShowToast(false);
              }}
              className="flex-shrink-0 text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-all duration-200"
              aria-label="Dismiss notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Action toast */}
      {actionToastVisible && (
        <div className="fixed right-4 bottom-6 z-[110] w-auto max-w-sm px-4 animate-in slide-in-from-bottom duration-300">
          <div className={`rounded-2xl p-3 shadow-2xl border ${actionToastType === 'success' ? 'bg-white/95 border-green-200' : 'bg-white/95 border-red-200'} flex items-start gap-3`}>
            <div className="flex-shrink-0 mt-0.5">
              {actionToastType === 'success' ? (
                <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{actionToastMessage}</p>
              <p className="text-xs text-gray-500 mt-0.5">{actionToastType === 'success' ? 'Saved to backend' : 'Save failed'}</p>
            </div>

            <button
              onClick={() => setActionToastVisible(false)}
              className="ml-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
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

            {/* Digital Clock */}
            <div className="hidden lg:flex items-center gap-2 ml-6 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <div className="text-sm font-semibold text-gray-700">
                {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                  timeZone: userTimezone
                })}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {currentTime.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  timeZone: userTimezone
                })}
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
                Home
              </button>
              <button onClick={() => setShowVisualization(true)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
                Insights
              </button>
              <button onClick={() => setShowWhatsNew(true)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                What's New
              </button>
              {/* Leaderboard Button */}
              {/* Leaderboard Button - Only for logged in users */}
              {isLoggedIn && (
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="ml-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105"
                >
                  <Award className="w-4 h-4" />
                  Rankings
                </button>
              )}

              {!isLoggedIn ? (
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => window.location.href = `${BACKEND_URL}/auth/google`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:shadow-md hover:border-gray-300 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                      <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.5h147.2c-6.4 34.6-25.5 64-54.3 83.7v69.7h87.7c51.2-47.2 81.9-116.5 81.9-198.5z" fill="#4285F4" />
                      <path d="M272 544.3c73.8 0 135.7-24.4 181-66.4l-87.7-69.7c-24.4 16.3-55.5 26-93.3 26-71.7 0-132.5-48.4-154.3-113.6H27.5v71.6C72.2 483 163.4 544.3 272 544.3z" fill="#34A853" />
                      <path d="M117.7 326.2c-10.3-30.8-10.3-64 0-94.8V159.8H27.5c-39.8 79.4-39.8 173.5 0 252.9l90.2-86.5z" fill="#FBBC05" />
                      <path d="M272 107.7c39 0 74 13.4 101.6 39.6l76.2-76.1C407.7 25.8 345.8 0 272 0 163.4 0 72.2 61.3 27.5 159.8l90.2 71.6C139.5 156.1 200.3 107.7 272 107.7z" fill="#EA4335" />
                    </svg>
                    <span className="hidden lg:inline">Sign in</span>
                  </button>

                  <button onClick={() => setShowLoginModal(true)} className="ml-2 px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200">
                    Get started
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 ml-2">
  <button 
    onClick={() => setShowProfileModal(true)}
    className="px-4 py-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 hover:border-indigo-300 hover:shadow-md text-sm flex items-center gap-3 shadow-sm transition-all duration-200 hover:scale-105"
  >
    <User className="w-4 h-4 text-gray-600" />
    <span className="truncate max-w-[8rem] font-medium text-gray-700">{userId}</span>
    {isLocalOnly && (
      <span className="ml-2 px-2 py-1 text-xs rounded bg-yellow-50 border border-yellow-200 text-yellow-700 font-semibold">
        {credits} credits
      </span>
    )}
  </button>

  <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-red-200 text-sm font-medium flex items-center gap-2 transition-all duration-200">
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
              <button onClick={() => { setShowWhatsNew(true); setMobileMenuOpen(false); }} className="text-left px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                What's New
              </button>
              {/* Leaderboard Button for Mobile */}
              {/* Leaderboard Button - Only for logged in users */}
              {isLoggedIn && (
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="ml-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105"
                >
                  <Award className="w-4 h-4" />
                  Rankings
                </button>
              )}
              {!isLoggedIn ? (
                <>
                  <button onClick={() => { window.location.href = `${BACKEND_URL}/auth/google`; }} className="text-left px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                    Sign in with Google
                  </button>
                  <button onClick={() => { setShowLoginModal(true); setMobileMenuOpen(false); }} className="text-left px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">
                    Get started
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-between px-4 py-2">
                  <button 
  onClick={() => { setShowProfileModal(true); setMobileMenuOpen(false); }} 
  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between group"
>
  <div className="flex items-center gap-2">
    <User className="w-4 h-4 text-gray-600" />
    <div className="text-sm font-medium">{userId}</div>
  </div>
</button>
<button 
  onClick={() => { handleLogout(); setMobileMenuOpen(false); }} 
  className="w-full text-left px-4 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 text-red-500 font-medium"
>
  <LogOut className="w-4 h-4" />
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
                    onClick={() => window.location.href = `${BACKEND_URL}/auth/google`}
                    className="flex items-center gap-3 px-8 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-200 font-semibold"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                      <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.5h147.2c-6.4 34.6-25.5 64-54.3 83.7v69.7h87.7c51.2-47.2 81.9-116.5 81.9-198.5z" fill="#4285F4" />
                      <path d="M272 544.3c73.8 0 135.7-24.4 181-66.4l-87.7-69.7c-24.4 16.3-55.5 26-93.3 26-71.7 0-132.5-48.4-154.3-113.6H27.5v71.6C72.2 483 163.4 544.3 272 544.3z" fill="#34A853" />
                      <path d="M117.7 326.2c-10.3-30.8-10.3-64 0-94.8V159.8H27.5c-39.8 79.4-39.8 173.5 0 252.9l90.2-86.5z" fill="#FBBC05" />
                      <path d="M272 107.7c39 0 74 13.4 101.6 39.6l76.2-76.1C407.7 25.8 345.8 0 272 0 163.4 0 72.2 61.3 27.5 159.8l90.2 71.6C139.5 156.1 200.3 107.7 272 107.7z" fill="#EA4335" />
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
                    {
                      title: 'Sticky Notes',
                      desc: 'Quick reminders anywhere on screen',
                      icon: Pin,          // or Pin if you're using that instead
                      color: 'from-yellow-400 to-orange-500'
                    }

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
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
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
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => openEditHabit(habit)}
                            className="text-gray-500 hover:text-indigo-600 hover:scale-110 transition-all duration-200 p-1 rounded"
                            title="Edit habit (costs 1 credit for local users)"
                          >
                            ✎
                          </button>

                          <button onClick={() => deleteHabit(habit.id)} className="text-gray-400 hover:text-red-500 hover:scale-110 transition-all duration-200 p-1 rounded">
                            <X className="w-6 h-6" />
                          </button>
                        </div>

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
                              className={`py-4 rounded-xl border-2 transition-all duration-200 text-center group/day relative overflow-hidden ${isCompleted ? 'shadow-md' : 'bg-white hover:bg-gray-50'
                                } ${isToday ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : 'cursor-default opacity-60'}`}
                              style={{
                                backgroundColor: isCompleted ? habit.color : undefined,
                                color: isCompleted ? 'white' : undefined,
                                borderColor: isCompleted ? habit.color : '#e5e7eb'
                              }}
                              title={`${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${isToday ? ' - Today (Click to toggle)' : ' - Locked (past day)'}`}
                            >
                              <div className="text-xs font-bold mb-1">
                                {date.toLocaleDateString('en-US', { weekday: 'short' })[0]}
                              </div>
                              <div className="text-[10px] font-semibold mb-1 opacity-75">
                                {date.getDate()}
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
      {/* Leaderboard Overlay Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex items-center justify-between z-10 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Award className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
                  <p className="text-sm text-indigo-100">See how you rank against others</p>
                </div>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
              <Leaderboard currentUserId={userId} initialLimit={20} />
            </div>
          </div>
        </div>
      )}

      {/* Timezone Modal (appear once on first run or via settings) */}
      {/* Profile Settings Modal */}
{showProfileModal && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Profile Settings</h2>
              <p className="text-sm text-indigo-100">Manage your visibility</p>
            </div>
          </div>
          <button 
            onClick={() => setShowProfileModal(false)}
            className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-200"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* User Info */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
          <Avatar src={null} seed={userId} size={56} />
          <div>
            <div className="font-bold text-gray-900">{username || userId}</div>
            <div className="text-sm text-gray-600">{userId}</div>
          </div>
        </div>

        {/* Leaderboard Visibility */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Leaderboard Visibility
              </h3>
              <p className="text-sm text-gray-600">
                Choose how you appear on the public leaderboard
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Public Option */}
            <label className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:bg-gray-50"
              style={{
                borderColor: anonymousSettings.showOnLeaderboard && !anonymousSettings.displayId ? '#6366f1' : '#e5e7eb',
                backgroundColor: anonymousSettings.showOnLeaderboard && !anonymousSettings.displayId ? '#eef2ff' : 'white'
              }}
            >
              <input
                type="radio"
                name="visibility"
                checked={anonymousSettings.showOnLeaderboard && !anonymousSettings.displayId}
                onChange={() => setAnonymousSettings({ showOnLeaderboard: true, displayId: null })}
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-gray-900">🌍 Public Profile</div>
                <div className="text-sm text-gray-600">Show your real name on leaderboard</div>
              </div>
            </label>

            {/* Anonymous Option */}
            <label className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:bg-gray-50"
              style={{
                borderColor: anonymousSettings.showOnLeaderboard && anonymousSettings.displayId ? '#6366f1' : '#e5e7eb',
                backgroundColor: anonymousSettings.showOnLeaderboard && anonymousSettings.displayId ? '#eef2ff' : 'white'
              }}
            >
              <input
                type="radio"
                name="visibility"
                checked={anonymousSettings.showOnLeaderboard && anonymousSettings.displayId !== null}
                onChange={() => {
                  const randomId = `User${Math.floor(Math.random() * 10000)}`;
                  setAnonymousSettings({ showOnLeaderboard: true, displayId: randomId });
                }}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">🎭 Anonymous</div>
                <div className="text-sm text-gray-600 mb-2">Show with a random display name</div>
                {anonymousSettings.showOnLeaderboard && anonymousSettings.displayId && (
                  <input
                    type="text"
                    value={anonymousSettings.displayId}
                    onChange={(e) => setAnonymousSettings({ ...anonymousSettings, displayId: e.target.value })}
                    placeholder="Display name"
                    className="w-full px-3 py-2 text-sm border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            </label>

            {/* Hidden Option */}
            <label className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:bg-gray-50"
              style={{
                borderColor: !anonymousSettings.showOnLeaderboard ? '#6366f1' : '#e5e7eb',
                backgroundColor: !anonymousSettings.showOnLeaderboard ? '#eef2ff' : 'white'
              }}
            >
              <input
                type="radio"
                name="visibility"
                checked={!anonymousSettings.showOnLeaderboard}
                onChange={() => setAnonymousSettings({ showOnLeaderboard: false, displayId: null })}
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-gray-900">🔒 Private</div>
                <div className="text-sm text-gray-600">Don't show me on leaderboard at all</div>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={async () => {
            try {
              await authFetch('/api/user/profile', {
                method: 'PATCH',
                body: JSON.stringify({ anonymous: anonymousSettings })
              });
              showSaveStatus('✓ Profile settings saved', 'success');
              setShowProfileModal(false);
            } catch (err) {
              console.error('Failed to save profile settings', err);
              showSaveStatus('⚠ Failed to save settings', 'error');
            }
          }}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          Save Settings
        </button>
      </div>
    </div>
  </div>
)}

{/* Timezone Modal (appear once on first run or via settings) */}
      {/* Timezone Modal (appear once on first run or via settings) */}
      {showTimezoneModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Select your timezone</h3>
              <button onClick={() => setShowTimezoneModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">We detected <strong>{detectedTz}</strong>. Confirm or paste a different IANA timezone (e.g., Asia/Kolkata, America/New_York).</p>

            <div className="mb-4">
              <input
                type="text"
                value={userTimezone}
                onChange={(e) => setUserTimezone(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Asia/Kolkata"
              />
              <p className="text-xs text-gray-500">If you leave this as-is, we will use the detected timezone.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => saveTimezone(userTimezone)} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-xl font-semibold">
                Save timezone
              </button>
              <button onClick={() => { setUserTimezone(detectedTz); saveTimezone(detectedTz); }} className="flex-1 bg-gray-100 px-4 py-3 rounded-xl font-semibold">
                Use detected ({detectedTz})
              </button>
            </div>
          </div>
        </div>
      )}

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
                    className={`py-4 rounded-xl border-2 transition-all duration-200 font-bold text-lg hover:scale-105 ${sleepQuality === rating
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
      {/* Edit Habit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Habit (costs 1 credit)</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <input className="w-full px-4 py-3 border rounded-xl mb-3" value={editHabitName} onChange={(e) => setEditHabitName(e.target.value)} />
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium">Color:</span>
              {colors.map(c => (
                <button key={c} onClick={() => setEditHabitColor(c)} className={`w-8 h-8 rounded-lg ${editHabitColor === c ? 'ring-2 ring-indigo-400' : ''}`} style={{ backgroundColor: c }} />
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={saveEditHabit} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-xl font-semibold">
                Save & Use 1 credit
              </button>
              <button onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-100 px-4 py-3 rounded-xl font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Out-of-credits Modal */}
      {showOutOfCreditsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-80 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-lg font-bold mb-3">You're out of credits</h3>
            <p className="text-sm text-gray-600 mb-6">Local users have a 6-credit trial for habit add/update. To unlock unlimited habit creation, please sign in with Google.</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = `${BACKEND_URL}/auth/google`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                  <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.5h147.2c-6.4 34.6-25.5 64-54.3 83.7v69.7h87.7c51.2-47.2 81.9-116.5 81.9-198.5z" fill="#4285F4" />
                  <path d="M272 544.3c73.8 0 135.7-24.4 181-66.4l-87.7-69.7c-24.4 16.3-55.5 26-93.3 26-71.7 0-132.5-48.4-154.3-113.6H27.5v71.6C72.2 483 163.4 544.3 272 544.3z" fill="#34A853" />
                  <path d="M117.7 326.2c-10.3-30.8-10.3-64 0-94.8V159.8H27.5c-39.8 79.4-39.8 173.5 0 252.9l90.2-86.5z" fill="#FBBC05" />
                  <path d="M272 107.7c39 0 74 13.4 101.6 39.6l76.2-76.1C407.7 25.8 345.8 0 272 0 163.4 0 72.2 61.3 27.5 159.8l90.2 71.6C139.5 156.1 200.3 107.7 272 107.7z" fill="#EA4335" />
                </svg>
                <span className="hidden lg:inline">Sign in</span>
              </button>

              <button onClick={() => setShowOutOfCreditsModal(false)} className="flex-1 bg-gray-100 px-4 py-3 rounded-xl font-semibold">
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* What's New Modal */}
      {showWhatsNew && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">What's New</h3>
                  <p className="text-sm text-gray-500 font-medium">{WHATS_NEW_VERSION}</p>
                </div>
              </div>
              <button
                onClick={dismissWhatsNew}
                className="text-gray-400 hover:text-gray-600 hover:scale-110 transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>


            <div className="space-y-6">
              {newFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className={`p-4 rounded-2xl bg-gradient-to-br ${feature.bgGradient} border ${feature.borderColor}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${feature.iconBg} text-white flex-shrink-0 mt-1`}>
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">{feature.title}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={dismissWhatsNew}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Got it! Let's go 🚀
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              You can always access this from the "What's New" menu
            </p>
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
                <a href={`${BACKEND_URL}/auth/google`} className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-200 font-semibold">
                  <svg className="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                    <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.5h147.2c-6.4 34.6-25.5 64-54.3 83.7v69.7h87.7c51.2-47.2 81.9-116.5 81.9-198.5z" fill="#4285F4" />
                    <path d="M272 544.3c73.8 0 135.7-24.4 181-66.4l-87.7-69.7c-24.4 16.3-55.5 26-93.3 26-71.7 0-132.5-48.4-154.3-113.6H27.5v71.6C72.2 483 163.4 544.3 272 544.3z" fill="#34A853" />
                    <path d="M117.7 326.2c-10.3-30.8-10.3-64 0-94.8V159.8H27.5c-39.8 79.4-39.8 173.5 0 252.9l90.2-86.5z" fill="#FBBC05" />
                    <path d="M272 107.7c39 0 74 13.4 101.6 39.6l76.2-76.1C407.7 25.8 345.8 0 272 0 163.4 0 72.2 61.3 27.5 159.8l90.2 71.6C139.5 156.1 200.3 107.7 272 107.7z" fill="#EA4335" />
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
