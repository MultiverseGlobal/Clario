import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  const cookieStore = await cookies()
  const onboardedCookie = cookieStore.get('metaphor_onboarded')?.value
  const defaultTarget = onboardedCookie === 'true' ? '/world' : '/onboard'
  const next = searchParams.get('next') ?? defaultTarget


  if (code) {
    const response = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )
    
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check user metadata if cookie is missing
      let isUserOnboarded = onboardedCookie === 'true';
      if (!isUserOnboarded && data?.session?.user) {
        isUserOnboarded = !!data.session.user.user_metadata?.project_name;
        if (isUserOnboarded) {
          try {
            cookieStore.set('metaphor_onboarded', 'true');
          } catch {}
        }
      }

      let actualNext = next;
      if (actualNext === '/onboard' && isUserOnboarded) {
        actualNext = '/world';
      }

      let redirectUrl = `${origin}${actualNext}`
      if (actualNext === '/onboard' && !actualNext.includes('step=')) {
        redirectUrl = `${origin}/onboard/step-1`
      }
      return NextResponse.redirect(redirectUrl)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-error`)
}
