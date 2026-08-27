import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { storage } from './storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether a Supabase project is configured. The app is fully usable in guest
 * mode with no backend at all — see the guest-mode note in 06 — so this is
 * checked rather than thrown on. `supabase` is null until `.env` is filled in.
 */
export const isBackendConfigured = Boolean(url && anonKey);

// Sessions live in MMKV rather than AsyncStorage: synchronous reads mean the app
// knows whether it is signed in before the first frame, so there is no auth flicker.
const authStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => {
    storage.remove(key);
  },
};

export const supabase = isBackendConfigured
  ? createClient<Database>(url!, anonKey!, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        // React Native has no URL bar; nothing to detect.
        detectSessionInUrl: false,
      },
    })
  : null;
