// The Supabase anon key is a public, RLS-protected credential — safe to
// ship as a fallback default. This guarantees the app works even if the
// hosting platform's env vars aren't configured yet; an env var, when
// set, always takes priority over this fallback.
const FALLBACK_SUPABASE_URL = "https://zwhxwwtowpfzxbjzvzba.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3aHh3d3Rvd3Bmenhianp2emJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTU3NjksImV4cCI6MjEwMzE5MTc2OX0.OT0Wp8qMoEqhUpgKfmJX88wkBO8922lNlEEUvBML4Dk";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
