export function calculateDailyProductivity(entry, totalHabits) {
  if (!entry || !totalHabits) return null;

  const habitRate = entry.completedHabits.length / totalHabits;
  let sleepScore = 50;

  if (entry.sleep?.hours >= 7 && entry.sleep?.quality >= 4) sleepScore = 100;
  else if (entry.sleep?.hours >= 6) sleepScore = 75;
  else if (entry.sleep?.hours < 5) sleepScore = 40;

  return Math.round((habitRate * 100 * 0.7) + (sleepScore * 0.3));
}

export function getDailyInsightMessage(entry, totalHabits) {
  if (!entry) return "Start small today — one habit is enough 🌱";

  const score = calculateDailyProductivity(entry, totalHabits);
  const sleep = entry.sleep?.hours ?? 0;

  if (sleep < 5) return "Low sleep detected 😴 Focus on just one key habit.";
  if (score >= 80) return "Strong day 💪 You balanced sleep and habits well.";
  if (score >= 50) return "Decent progress 👍 One more habit could level this up.";

  return "Slow days still count — consistency beats intensity 🌿";
}
