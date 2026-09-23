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
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              supabaseResponse = NextResponse.next({ request })
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

  const hasOnboarded = request.cookies.has("metaphor_onboarded");
  // isAuthenticated: verified Supabase user, OR Supabase is not configured (local dev without keys)
  const isAuthenticated = !!user || (!hasSupabaseConfig && hasOnboarded);

  const pathname = request.nextUrl.pathname;

  const isProtectedRoute =
    pathname.startsWith('/world') ||
    pathname.startsWith('/tools') ||
    pathname.startsWith('/handoffs') ||
    pathname.startsWith('/context') ||
    pathname.startsWith('/connections') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile');

  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  const isOnboardRoute = pathname.startsWith('/onboard');
  const isRoot = pathname === '/';

  // Redirect root "/" for already-authenticated+onboarded users straight to /world
  if (isRoot && user && hasOnboarded) {
    const url = request.nextUrl.clone()
    url.pathname = '/world'
    return NextResponse.redirect(url)
  }

  // Allow unrestricted access to onboarding and auth flows
  if (isOnboardRoute || isAuthRoute) {
    // Only redirect away from login/signup if user has a live verified session + has onboarded
    if (user && hasOnboarded && isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/world'
      return NextResponse.redirect(url)
    }
    return supabaseResponse;
  }

  // Gate protected routes — redirect unauthenticated users to /login
  if (hasSupabaseConfig && !isAuthenticated && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
