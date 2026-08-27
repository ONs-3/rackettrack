import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Linking from 'expo-linking';
import { isBackendConfigured, supabase } from '@/lib/supabase';

export type AuthProvider = 'google' | 'email';

let googleConfigured = false;

/**
 * Every provider goes through this one function so a third is a new case,
 * not a refactor (06-offline-sync-and-push.md). `webClientId` is the WEB
 * OAuth client ID — the Android client IDs are never referenced in source,
 * they only exist so Google can verify the app's signing certificate.
 */
export async function signIn(provider: AuthProvider, email?: string) {
  if (!isBackendConfigured || !supabase) {
    throw new Error('Sign-in needs a configured Supabase project — add EXPO_PUBLIC_SUPABASE_* to .env.');
  }

  if (provider === 'google') {
    if (!googleConfigured) {
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      if (!webClientId) {
        throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing from .env.');
      }
      GoogleSignin.configure({ webClientId });
      googleConfigured = true;
    }
    // Not optional on Android — some devices genuinely lack current Play Services,
    // and without this check the failure is otherwise silent.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const { data } = await GoogleSignin.signIn();
    if (!data?.idToken) throw new Error('Google did not return an ID token.');
    return supabase.auth.signInWithIdToken({ provider: 'google', token: data.idToken });
  }

  if (!email?.trim()) throw new Error('Enter an email address.');
  return supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: Linking.createURL('auth/callback') },
  });
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
  if (googleConfigured) await GoogleSignin.signOut().catch(() => {});
}
