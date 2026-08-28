import { Home, Wallet, Timer, Target, BarChart3, User, HeartPulse, Dumbbell, Briefcase, Flame } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/fitness", label: "Fitness", icon: Dumbbell },
  { href: "/business", label: "Business", icon: Briefcase },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/habits", label: "Habits", icon: Flame },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
] as const;
