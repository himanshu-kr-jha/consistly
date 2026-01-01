export function getCoachMessage({ lowSleep, missedToday, strongWeek }) {
  if (lowSleep) return "You’re tired — protect your energy today 🌙";
  if (missedToday) return "Missed days don’t break progress. Show up tomorrow 💚";
  if (strongWeek) return "Consistency unlocked 🔓 You can raise difficulty now.";

  return "Small wins train your brain to keep going 🧠✨";
}
