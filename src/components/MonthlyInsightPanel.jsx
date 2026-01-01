import { compareMonthlyPerformance } from '../insights';

export default function MonthlyInsightPanel({ currentMonth, lastMonth }) {
  return (
    <p className="text-sm">
      {compareMonthlyPerformance(currentMonth, lastMonth)}
    </p>
  );
}
