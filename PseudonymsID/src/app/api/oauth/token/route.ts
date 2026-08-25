import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    return NextResponse.json({
      access_token: session.access_token,
      token_type: "Bearer",
      expires_in: session.expires_in,
      refresh_token: session.refresh_token,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "invalid_grant", message: err.message }, { status: 400 });
  }
}
