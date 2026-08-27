import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space, type as t } from '@/theme/tokens';
import { listMatches, type ArchivedMatch } from '@/lib/archive';
import { buildLadder, primaryPlayerName, type LadderRow } from '@/features/match/stats';
import { replay, scoreline } from '@/features/scoring/engine';
import { useSession } from '@/features/auth/useSession';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
}

function sessionLine(): string {
  const now = new Date();
  const day = now.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day} SESSION · ${time}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [matches, setMatches] = useState<ArchivedMatch[]>([]);

  useFocusEffect(
    useCallback(() => {
      setMatches(listMatches());
    }, []),
  );

  const { session } = useSession();
  const ladder = buildLadder(matches);
  const name = primaryPlayerName(matches);
  const lastMatch = matches[0] ?? null;
  const initials = session?.user.email ? session.user.email.slice(0, 2).toUpperCase() : (name ?? 'RT').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[t.metaLabel, { color: colors.textFaint }]}>{sessionLine()}</Text>
            <Text style={[t.displayLg, { color: colors.text, marginTop: 6, fontSize: 30, lineHeight: 34 }]}>
              {greeting()}{name ? `, ${name}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/sign-in')}
            accessibilityRole="button"
            accessibilityLabel={session ? 'Account' : 'Sign in'}
            style={styles.avatar}
          >
            <Text style={[t.bodySm, { color: colors.limeA }]}>{initials}</Text>
          </Pressable>
        </View>

        <View style={styles.chips}>
          <View style={[styles.chip, styles.chipActive]}>
            <Text style={[t.label, { color: colors.onAccent }]}>PADEL</Text>
          </View>
          <View style={styles.chip}>
            <Text style={[t.label, { color: colors.textFaint }]}>
              BADMINTON<Text style={styles.soon}> SOON</Text>
            </Text>
          </View>
          <View style={styles.chip}>
            <Text style={[t.label, { color: colors.textFaint }]}>
              TENNIS<Text style={styles.soon}> SOON</Text>
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/match/new')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.startCard, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[t.metaLabel, { color: colors.onAccent, opacity: 0.6 }]}>TAP TO BEGIN</Text>
          <View style={styles.startRow}>
            <Text style={[t.displayLg, { color: colors.onAccent, fontSize: 34 }]}>Start{'\n'}match</Text>
            <View style={styles.startArrow}>
              <MaterialCommunityIcons name="arrow-right-thick" size={22} color={colors.limeA} />
            </View>
          </View>
        </Pressable>

        <View style={[styles.sectionHeader, { marginTop: space.xl }]}>
          <Text style={[t.metaLabel, { color: colors.textFaint }]}>SESSION LADDER</Text>
          <Text style={[t.bodySm, { color: colors.limeA }]}>{ladder.length} PLAYERS</Text>
        </View>

        {ladder.length === 0 ? (
          <Text style={[t.caption, { color: colors.textFaint, marginTop: 10 }]}>
            Play a match to start the ladder.
          </Text>
        ) : (
          <View style={styles.ladderCard}>
            {ladder.map((row: LadderRow) => (
              <View key={row.name} style={styles.ladderRow}>
                <Text style={[t.metaLabel, { color: colors.textFaint, width: 18 }]}>{row.rank}</Text>
                <Text style={[t.bodySm, { color: colors.text, flex: 1 }]} numberOfLines={1}>{row.name}</Text>
                {row.hot && (
                  <View style={styles.hotBadge}>
                    <Text style={[t.metaLabel, { color: colors.onAccent, fontSize: 9.5 }]}>ON FIRE</Text>
                  </View>
                )}
                <Text style={[t.bodySm, { color: colors.textMuted, fontVariant: ['tabular-nums'] }]}>
                  {row.wins}-{row.losses}
                </Text>
              </View>
            ))}
          </View>
        )}

        {lastMatch && (() => {
          const myTeam = name
            ? (lastMatch.teams.findIndex((team) => team.some((p) => p.displayName === name)) as 0 | 1 | -1)
            : -1;
          const oppTeam = myTeam === -1 ? 1 : myTeam === 0 ? 1 : 0;
          const badge =
            lastMatch.status === 'abandoned' ? 'NO RESULT' : lastMatch.winner === myTeam ? 'WON' : 'LOST';
          return (
            <>
              <Text style={[t.metaLabel, { color: colors.textFaint, marginTop: space.xl }]}>LAST MATCH</Text>
              <Pressable
                onPress={() => router.push(`/match/${lastMatch.clientId}`)}
                accessibilityRole="button"
                style={styles.lastMatchRow}
              >
                <View
                  style={[
                    styles.resultBadge,
                    badge === 'NO RESULT'
                      ? styles.resultBadgeOutline
                      : { backgroundColor: badge === 'WON' ? colors.limeA : colors.zoneB },
                  ]}
                >
                  <Text
                    style={[
                      t.metaLabel,
                      { fontSize: 9.5 },
                      badge === 'WON'
                        ? { color: colors.onAccent }
                        : badge === 'LOST'
                          ? { color: colors.text }
                          : { color: colors.textMuted },
                    ]}
                  >
                    {badge}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[t.bodySm, { color: colors.text }]} numberOfLines={1}>
                    vs {lastMatch.teams[oppTeam].map((p) => p.displayName).join(' & ')}
                  </Text>
                  <Text style={[t.micro, { color: colors.textFaint, marginTop: 2 }]}>
                    {new Date(lastMatch.endedAt).toDateString()}
                  </Text>
                </View>
                <Text style={[t.bodySm, { color: colors.text, fontVariant: ['tabular-nums'] }]}>
                  {scoreline(replay(lastMatch.format, lastMatch.timeline))}
                </Text>
              </Pressable>
            </>
          );
        })()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.screenH, paddingTop: space.lg, paddingBottom: space.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerText: { flex: 1, marginRight: space.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chips: { flexDirection: 'row', gap: space.sm, marginTop: space.xxl },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chipActive: { backgroundColor: colors.limeA, borderColor: colors.limeA },
  soon: { fontSize: 8 },
  startCard: {
    marginTop: 18,
    borderRadius: radius.zone,
    backgroundColor: colors.limeA,
    padding: space.xxl,
  },
  startRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 },
  startArrow: {
    width: 46,
    height: 34,
    borderRadius: radius.segment,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  ladderCard: {
    marginTop: 10,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  ladderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  hotBadge: { backgroundColor: colors.orangeB, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  lastMatchRow: {
    marginTop: 10,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  resultBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  resultBadgeOutline: { borderWidth: 1, borderColor: colors.hairline },
});
