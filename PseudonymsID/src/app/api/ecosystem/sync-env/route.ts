import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
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

    const body = await req.json();
    const { gemini_api_key, openai_api_key, anthropic_api_key } = body;

    const { error } = await supabase.auth.updateUser({
      data: {
        ...(gemini_api_key && { gemini_api_key }),
        ...(openai_api_key && { openai_api_key }),
        ...(anthropic_api_key && { anthropic_api_key }),
      },
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Keys saved to Supabase user profile" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save keys" },
      { status: 500 }
    );
  }
}
