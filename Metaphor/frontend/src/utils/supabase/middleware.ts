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
  } else if (!hasSupabaseConfig) {
    // Single-tenant or sovereign environment without cloud Supabase keys
    user = { id: "sovereign_admin" };
  }

  const isUnlocked = request.cookies.has("metaphor_unlocked");
  const isAuthenticated = !hasSupabaseConfig || !!user || isUnlocked;

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/home') || request.nextUrl.pathname.startsWith('/inbox');
  const isLoginRoute = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup';

  if (!isAuthenticated && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  const hasOnboarded = request.cookies.has("metaphor_onboarded") || isUnlocked || !hasSupabaseConfig;

  // Redirect logged-in users away from the marketing landing page unless explicitly signed out or viewing landing
  const isLandingPage = request.nextUrl.pathname === '/';
  const isExplicitLanding = request.cookies.has("metaphor_signed_out") || request.nextUrl.searchParams.has("landing");
  if (isAuthenticated && isLandingPage && !isExplicitLanding) {
    const url = request.nextUrl.clone()
    url.pathname = hasOnboarded ? '/home' : '/onboarding'
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && isLoginRoute) {
    const url = request.nextUrl.clone()
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    url.pathname = redirectParam || (hasOnboarded ? '/home' : '/onboarding')
    url.searchParams.delete('redirect')
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && isProtectedRoute && !hasOnboarded) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && hasOnboarded && request.nextUrl.pathname === '/onboarding') {
    const url = request.nextUrl.clone()
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    url.pathname = redirectParam || '/home'
    url.searchParams.delete('redirect')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

