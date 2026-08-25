import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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

  let user = null;

  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null;
  } catch (err) {
    console.error("Middleware auth error (failing closed):", err);
    user = null;
  }

  const isUnlocked = request.cookies.has("metaphor_unlocked");
  const isAuthenticated = !!user || isUnlocked;

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/inbox');
  const isLoginRoute = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup';

  if (!isAuthenticated && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  const hasOnboarded = request.cookies.has("metaphor_onboarded") || isUnlocked;

  // Redirect logged-in users away from the marketing landing page
  const isLandingPage = request.nextUrl.pathname === '/';
  if (isAuthenticated && isLandingPage) {
    const url = request.nextUrl.clone()
    url.pathname = hasOnboarded ? '/dashboard' : '/onboarding'
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = hasOnboarded ? '/dashboard' : '/onboarding'
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && isProtectedRoute && !hasOnboarded) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && hasOnboarded && request.nextUrl.pathname === '/onboarding') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

