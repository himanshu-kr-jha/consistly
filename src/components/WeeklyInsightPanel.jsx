import { getWeakestWeekday, getSleepHabitCorrelation } from '../insights';

export default function WeeklyInsightPanel({ entries, habitCount }) {
  const weakDay = getWeakestWeekday(entries);
  const correlation = getSleepHabitCorrelation(entries, habitCount);

  return (
    <div className="space-y-3">
      {weakDay && <p>📉 Weakest day: <b>{weakDay}</b></p>}
      {correlation && <p>😴 Sleep boosted productivity by <b>{correlation}%</b></p>}
    </div>
  );
}
