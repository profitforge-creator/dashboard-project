import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/auth-code-error"];

export async function updateSession(request: NextRequest) {
  // Fail open rather than crashing every request: a momentarily-
  // unreachable Supabase project must not take the whole site down via
  // MIDDLEWARE_INVOCATION_FAILED. Pages that actually need auth/data
  // still fail (visibly, per-route) if this happens.
  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user: existingUser },
    } = await supabase.auth.getUser();
    let user = existingUser;

    const path = request.nextUrl.pathname;
    const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p)) || path.startsWith("/_next") || path === "/favicon.ico";

    // No account, no password, nothing to click: silently start an
    // anonymous Supabase session on first visit so there's never a
    // login screen. Requires "Anonymous Sign-Ins" enabled in the
    // Supabase project's Auth settings.
    if (!user && !isPublic) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (!error) {
        user = data.user;
      } else {
        console.error("Anonymous sign-in failed (enable it in Supabase Auth settings):", error.message);
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    }

    return supabaseResponse;
  } catch (err) {
    console.error("Supabase middleware crashed, letting the request through:", err);
    return NextResponse.next({ request });
  }
}
