import { getCoachMessage } from '../insights';

export default function CoachInsightCard({ context }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
      <p className="text-sm font-medium text-green-800">
        🧠 Coach says:
      </p>
      <p className="text-sm text-green-700 mt-1">
        {getCoachMessage(context)}
      </p>
    </div>
  );
}
