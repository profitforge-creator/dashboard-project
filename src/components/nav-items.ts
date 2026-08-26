import { Home, Timer, Target, BarChart3, User } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
] as const;
