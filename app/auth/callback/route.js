import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Supabase OAuth callback (storage / legacy OAuth only).
 * Identity for the app is Better Auth, this route only exchanges a Supabase OAuth code when configured.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/auth/confirmed';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[auth/callback] Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)');
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get('cookie') || '';
        return cookieHeader.split(';').map((c) => {
          const [name, ...v] = c.split('=');
          return { name: name?.trim(), value: v.join('=')?.trim() };
        });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback] exchangeCodeForSession:', error.message);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  return response;
}
