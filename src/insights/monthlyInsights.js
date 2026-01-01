export function compareMonthlyPerformance(current, previous) {
  if (!previous.length) return "This is your first tracked month 🎉";

  const avg = arr =>
    arr.reduce((s, e) => s + e.completedHabits.length, 0) / arr.length;

  const diff = avg(current) - avg(previous);

  if (diff > 0) return `Upward trend 🚀 +${diff.toFixed(1)} habits/day`;
  if (diff < 0) return "Slight dip 📉 Focus on recovery & sleep";

  return "Stable month ⚖️ Consistency maintained";
}
