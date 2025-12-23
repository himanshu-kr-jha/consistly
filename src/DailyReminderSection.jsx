import React, { useState } from 'react';

// ⚠️ REPLACE THIS WITH YOUR ACTUAL PUBLIC VAPID KEY
const PUBLIC_VAPID_KEY = 'BHMDFP4NJYw1FO3foVVAD8xj7i0GZNpTmncMXVOJ2Iks9ToxnBud5VNFRz_BbW5on-n1CbYH3El7TLIumRsQfI8';

// Helper: Convert VAPID key for the browser
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function DailyReminderSection({ 
  time, 
  setTime, 
  isLoggedIn, 
  authFetch, 
  showSaveStatus 
}) {
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleEnableNotifications = async () => {
    if (!('serviceWorker' in navigator)) return alert('Service Workers not supported');
    if (!isLoggedIn) return alert('Please log in to enable cloud reminders.');

    setIsSubscribing(true);
    try {
      // 1. Register Service Worker
      const register = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      
      // 2. Subscribe using PushManager
      const subscription = await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });

      // 3. Send Subscription to Backend
      await authFetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription)
      });
      
      showSaveStatus('✓ Notifications Enabled!', 'success');
    } catch (err) {
      console.error('Subscription failed', err);
      if (Notification.permission === 'denied') {
        alert('Notifications are blocked. Please click the Lock icon 🔒 in your URL bar to enable them.');
      } else {
        showSaveStatus('⚠ Subscription failed', 'error');
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <span className="text-xl">🔔</span>
            Daily Reminder
          </h3>
          <p className="text-sm text-gray-600">
            Receive a notification to log your habits.
          </p>
        </div>
        
        <button
          onClick={handleEnableNotifications}
          disabled={isSubscribing}
          className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors"
        >
          {isSubscribing ? 'Enabling...' : 'Enable Permissions'}
        </button>
      </div>

      <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 flex items-center justify-between">
        <span className="font-medium text-gray-700">Remind me at:</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-800"
        />
      </div>
      <p className="text-xs text-gray-500">
        * Ensure you have clicked "Enable" at least once on this device.
      </p>
    </div>
  );
}