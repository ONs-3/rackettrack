import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PillButton } from '@/components/PillButton';
import { ListGroup } from '@/components/ListGroup';
import { ListRow } from '@/components/ListRow';
import { colors, radius, space, type as t } from '@/theme/tokens';
import { useSession } from '@/features/auth/useSession';
import { createSquad, fetchMySquad, fetchRoster, joinSquadByCode } from '@/features/squad/squadApi';
import { setCachedSquad } from '@/features/squad/currentSquad';
import { claimGuestMatches, unclaimedCount } from '@/lib/outbox';
import { drainOutbox } from '@/lib/outbox';

export default function SquadScreen() {
  const insets = useSafeAreaInsets();
  const { session, loading: sessionLoading } = useSession();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const squadQuery = useQuery({
    queryKey: ['squad', session?.user.id],
    queryFn: fetchMySquad,
    enabled: !!session,
  });

  const rosterQuery = useQuery({
    queryKey: ['roster', squadQuery.data?.id],
    queryFn: () => fetchRoster(squadQuery.data!.id),
    enabled: !!squadQuery.data,
  });

  const onSquadReady = (squad: NonNullable<typeof squadQuery.data>) => {
    setCachedSquad(squad);
    queryClient.invalidateQueries({ queryKey: ['squad'] });
    const pending = unclaimedCount();
    if (pending > 0) {
      claimGuestMatches(squad.id);
      drainOutbox();
    }
  };

  const create = useMutation({
    mutationFn: () => createSquad(name),
    onSuccess: onSquadReady,
  });

  const join = useMutation({
    mutationFn: () => joinSquadByCode(code),
    onSuccess: onSquadReady,
  });

  const close = () => router.back();
  const squad = squadQuery.data;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
          <Text style={[t.navAction, { color: colors.limeA }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.navTitle, { color: colors.text, flex: 1, textAlign: 'center' }]}>Squad</Text>
        <Text style={[t.navAction, { color: 'transparent' }]}>Cancel</Text>
      </View>

      <View style={styles.content}>
        {!session && !sessionLoading ? (
          <>
            <Text style={[t.body, { color: colors.textMuted }]}>Sign in to create or join a squad.</Text>
            <PillButton label="Sign in" onPress={() => router.replace('/sign-in')} style={{ marginTop: space.xl }} />
          </>
        ) : sessionLoading || squadQuery.isLoading ? (
          <ActivityIndicator color={colors.limeA} />
        ) : squad ? (
          <>
            <Text style={[t.displayLg, { color: colors.text, fontSize: 26 }]}>{squad.name}</Text>

            <Text style={[t.sectionCap, { color: colors.textFaint, marginTop: space.xl, paddingLeft: 4 }]}>
              INVITE CODE
            </Text>
            <View style={styles.codeRow}>
              <Text style={[t.recapScore, { color: colors.limeA, letterSpacing: 4 }]}>{squad.invite_code}</Text>
              <Pressable
                onPress={() =>
                  Share.share({
                    message: `Join my RacketTrack squad — rackettrack://join/${squad.invite_code}`,
                  })
                }
                accessibilityRole="button"
              >
                <Text style={[t.navAction, { color: colors.limeA }]}>Share</Text>
              </Pressable>
            </View>

            <Text style={[t.sectionCap, { color: colors.textFaint, marginTop: space.xl, paddingLeft: 4 }]}>
              ROSTER
            </Text>
            <ListGroup style={{ marginTop: 8 }}>
              {(rosterQuery.data ?? []).length === 0 ? (
                <ListRow label="No players yet">
                  <Text style={[t.bodySm, { color: colors.textFaint }]}>—</Text>
                </ListRow>
              ) : (
                (rosterQuery.data ?? []).map((p) => (
                  <ListRow key={p.id} label={p.display_name}>
                    <Text style={[t.bodySm, { color: p.claimed_by ? colors.limeA : colors.textFaint }]}>
                      {p.claimed_by ? 'Joined' : 'Unclaimed'}
                    </Text>
                  </ListRow>
                ))
              )}
            </ListGroup>
          </>
        ) : (
          <>
            <Text style={[t.sectionCap, { color: colors.textFaint, paddingLeft: 4 }]}>CREATE A SQUAD</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Squad name"
              placeholderTextColor={colors.textFaint}
              style={[t.body, styles.input, { color: colors.text }]}
            />
            <PillButton
              label={create.isPending ? 'Creating…' : 'Create squad'}
              onPress={() => create.mutate()}
              disabled={!name.trim() || create.isPending}
              style={{ marginTop: space.md }}
            />

            <Text style={[t.sectionCap, { color: colors.textFaint, marginTop: space.xxl, paddingLeft: 4 }]}>
              OR JOIN WITH A CODE
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="ABCD1234"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              style={[t.body, styles.input, { color: colors.text }]}
            />
            <PillButton
              label={join.isPending ? 'Joining…' : 'Join squad'}
              onPress={() => join.mutate()}
              disabled={!code.trim() || join.isPending}
              style={{ marginTop: space.md }}
            />

            {(create.isError || join.isError) && (
              <Text style={[t.caption, { color: colors.orangeB, marginTop: space.lg }]}>
                {(create.error as Error)?.message || (join.error as Error)?.message}
              </Text>
            )}
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
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  codeRow: {
    marginTop: 8,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
