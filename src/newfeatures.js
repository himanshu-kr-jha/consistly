// Features list for What's New modal
import {
  Calendar, TrendingUp, Award, Plus, X, Check, Moon,
  BarChart3, User, LogIn, LogOut, Info, Menu, Sparkles, Pin,
} from 'lucide-react';
const newFeatures = [
  {
    id: 1,
    icon: Calendar,
    title: '🕐 Live Digital Clock',
    description: 'Stay on track with a real-time clock in the header showing your current time and date. Perfect for quick reference while logging habits!',
    bgGradient: 'from-blue-50 to-cyan-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-500'
  },
  {
    id: 2,
    icon: Calendar,
    title: '📅 Date Labels on Habit Blocks',
    description: 'Each habit tracking block now shows the date number (1-31) so you always know exactly which day you\'re logging. No more confusion!',
    bgGradient: 'from-purple-50 to-pink-50',
    borderColor: 'border-purple-200',
    iconBg: 'bg-purple-500'
  },
  {
    id: 3,
    icon: Pin,
    title: '📝 Sticky Notes Feature',
    description: 'Add quick reminders and notes that stick to your screen! Perfect for jotting down goals, motivation, or important reminders while tracking habits.',
    bgGradient: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    iconBg: 'bg-green-500'
  },
//   {
//     id: 4,
//     icon: TrendingUp,
//     title: '⚡ Enhanced Tooltips',
//     description: 'Hover over any habit block to see the full date and status. Tooltips now show complete information including year for better clarity.',
//     bgGradient: 'from-orange-50 to-red-50',
//     borderColor: 'border-orange-200',
//     iconBg: 'bg-orange-500'
//   }
];
export default newFeatures;