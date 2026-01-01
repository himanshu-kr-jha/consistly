import { getDailyInsightMessage, calculateDailyProductivity } from '../insights';

export default function TodayInsightCard({ todayEntry, habitCount }) {
  const score = calculateDailyProductivity(todayEntry, habitCount);
  const message = getDailyInsightMessage(todayEntry, habitCount);

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 shadow-lg mb-6">
      <h3 className="text-sm font-semibold opacity-80 mb-1">Today’s Insight</h3>
      <p className="text-3xl font-bold mb-2">{score ?? '--'} / 100</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}
