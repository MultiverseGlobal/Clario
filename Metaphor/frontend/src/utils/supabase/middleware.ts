import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  let user = null;
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') && (c.name.includes('-auth-token') || c.name.endsWith('-token'))
  );

  if (hasSupabaseConfig && hasAuthCookie) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
              supabaseResponse = NextResponse.next({
                request,
              })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )
      const { data } = await supabase.auth.getUser()
      user = data?.user || null;
    } catch (err) {
      console.error("Middleware auth error:", err);
      user = null;
    }
  }

  const isUnlocked = request.cookies.has("metaphor_unlocked");
  const hasOnboarded = request.cookies.has("metaphor_onboarded");
  const isAuthenticated = !!user || isUnlocked || (!hasSupabaseConfig && hasOnboarded);

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = pathname.startsWith('/world') || pathname.startsWith('/tools') || pathname.startsWith('/handoffs') || pathname.startsWith('/context') || pathname.startsWith('/connections') || pathname.startsWith('/settings');
  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  const isOnboardRoute = pathname.startsWith('/onboard');

  // Allow unrestricted access to onboarding and auth flows
  if (isOnboardRoute || isAuthRoute) {
    // Only redirect away from login/signup if user has a verified live session and explicitly completed onboarding
    if (user && hasOnboarded && isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/world'
      return NextResponse.redirect(url)
    }
    return supabaseResponse;
  }

  // If trying to access protected routes without authentication when Supabase is configured
  if (hasSupabaseConfig && !isAuthenticated && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
