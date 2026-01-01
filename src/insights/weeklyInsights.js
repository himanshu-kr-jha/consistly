export function getWeakestWeekday(entries) {
  const map = {};

  entries.forEach(e => {
    const day = new Date(e.date).toLocaleString('en-US', { weekday: 'long' });
    map[day] = (map[day] || 0) + e.completedHabits.length;
  });

  return Object.entries(map).sort((a, b) => a[1] - b[1])[0]?.[0];
}

export function getSleepHabitCorrelation(entries, habitCount) {
  let goodSleepDays = 0;
  let goodCompletionDays = 0;

  entries.forEach(e => {
    if (e.sleep?.hours >= 7) {
      goodSleepDays++;
      if (e.completedHabits.length >= habitCount * 0.6) {
        goodCompletionDays++;
      }
    }
  });

  if (!goodSleepDays) return null;
  return Math.round((goodCompletionDays / goodSleepDays) * 100);
}
