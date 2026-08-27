import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillButton } from '@/components/PillButton';
import { colors, radius, space, type as t } from '@/theme/tokens';
import { signIn, signOut } from '@/features/auth/auth';
import { useSession } from '@/features/auth/useSession';
import { isBackendConfigured } from '@/lib/supabase';
import { unclaimedCount } from '@/lib/outbox';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { session, loading } = useSession();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const close = () => router.back();

  const withGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn('google');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const withEmail = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn('email', email);
      setMagicLinkSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the magic link.');
    } finally {
      setBusy(false);
    }
  };

  const pending = unclaimedCount();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
          <Text style={[t.navAction, { color: colors.limeA }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.navTitle, { color: colors.text, flex: 1, textAlign: 'center' }]}>
          {session ? 'Account' : 'Sign in'}
        </Text>
        <Text style={[t.navAction, { color: 'transparent' }]}>Cancel</Text>
      </View>

      <View style={styles.content}>
        {!isBackendConfigured ? (
          <Text style={[t.body, { color: colors.textMuted }]}>
            No Supabase project is configured yet. Add EXPO_PUBLIC_SUPABASE_URL and
            EXPO_PUBLIC_SUPABASE_ANON_KEY to .env to enable sign-in.
          </Text>
        ) : loading ? (
          <ActivityIndicator color={colors.limeA} />
        ) : session ? (
          <>
            <Text style={[t.body, { color: colors.text }]}>Signed in as</Text>
            <Text style={[t.bodySm, { color: colors.textMuted, marginTop: 4 }]}>
              {session.user.email ?? session.user.id}
            </Text>
            {pending > 0 && (
              <Text style={[t.caption, { color: colors.textFaint, marginTop: space.lg }]}>
                {pending} offline {pending === 1 ? 'match is' : 'matches are'} waiting for a squad to
                sync to — create or join one from Home.
              </Text>
            )}
            <PillButton
              label="Sign out"
              onPress={async () => {
                await signOut();
                router.back();
              }}
              style={{ marginTop: space.xxl }}
            />
          </>
        ) : magicLinkSent ? (
          <Text style={[t.body, { color: colors.text }]}>
            Check {email} for a sign-in link. You can close this screen.
          </Text>
        ) : (
          <>
            <PillButton label="Continue with Google" onPress={withGoogle} />

            <Text style={[t.caption, { color: colors.textFaint, marginTop: space.xxl, marginBottom: space.sm }]}>
              OR EMAIL A LINK
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[t.body, styles.input, { color: colors.text }]}
            />
            <Pressable
              onPress={withEmail}
              disabled={busy}
              style={({ pressed }) => [styles.linkButton, { opacity: pressed || busy ? 0.6 : 1 }]}
            >
              <Text style={[t.navAction, { color: colors.limeA }]}>Send magic link</Text>
            </Pressable>

            {error && <Text style={[t.caption, { color: colors.orangeB, marginTop: space.lg }]}>{error}</Text>}
          </>
        )}
      </View>

      <View style={{ height: insets.bottom + space.bottomInset }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nav: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  content: { flex: 1, paddingHorizontal: space.screenH, paddingTop: space.xxl },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  linkButton: { alignItems: 'center', paddingVertical: space.lg },
});
