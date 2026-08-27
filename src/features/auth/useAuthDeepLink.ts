import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

/**
 * Completes an email magic-link sign-in. Supabase's OTP link redirects to
 * `rackettrack://auth/callback?code=...` (PKCE flow); exchanging the code
 * establishes the session. Mount once, at the root layout, so a link tapped
 * from any screen (or a cold start from the link) completes sign-in.
 */
export function useAuthDeepLink(): void {
  useEffect(() => {
    if (!supabase) return;

    const handle = (url: string) => {
      const { queryParams } = Linking.parse(url);
      const code = queryParams?.code;
      if (typeof code === 'string' && supabase) {
        supabase.auth.exchangeCodeForSession(code).catch(() => {});
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    Linking.getInitialURL().then((url) => {
      if (url) handle(url);
    });
    return () => sub.remove();
  }, []);
}
