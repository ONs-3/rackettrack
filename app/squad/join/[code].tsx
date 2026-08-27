import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type as t } from '@/theme/tokens';
import { useSession } from '@/features/auth/useSession';
import { joinSquadByCode } from '@/features/squad/squadApi';
import { setCachedSquad } from '@/features/squad/currentSquad';
import { setPendingJoinCode } from '@/features/squad/pendingJoin';
import { claimGuestMatches, drainOutbox, unclaimedCount } from '@/lib/outbox';

/** Deep-link target for `rackettrack://join/<code>` (see app/join/[code].tsx). */
export default function JoinSquadScreen() {
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, loading } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !code) return;

    if (!session) {
      // Hold the code, send them to sign in, and resume after (04-screens.md).
      setPendingJoinCode(code);
      router.replace('/sign-in');
      return;
    }

    joinSquadByCode(code)
      .then((squad) => {
        setCachedSquad(squad);
        if (unclaimedCount() > 0) {
          claimGuestMatches(squad.id);
          drainOutbox();
        }
        router.replace('/');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not join that squad.'));
  }, [loading, session, code]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {error ? (
        <Text style={[t.body, { color: colors.orangeB, textAlign: 'center', paddingHorizontal: 32 }]}>
          {error}
        </Text>
      ) : (
        <ActivityIndicator color={colors.limeA} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
