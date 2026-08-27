import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { colors, radius, space, type as t } from '@/theme/tokens';
import { listMatches, type ArchivedMatch } from '@/lib/archive';
import { PointTimeline } from '@/components/PointTimeline';
import {
  courtTime,
  formatDuration,
  playerRecord,
  primaryPlayerName,
  trailingStreak,
} from '@/features/match/stats';
import { replay, scoreline } from '@/features/scoring/engine';

function monthOf(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'long' }).toUpperCase();
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [matches, setMatches] = useState<ArchivedMatch[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setMatches(listMatches());
    }, []),
  );

  const name = primaryPlayerName(matches);
  const record = name ? playerRecord(matches, name) : { wins: 0, losses: 0 };
  const streak = name ? trailingStreak(matches, name) : null;

  const groups = new Map<string, ArchivedMatch[]>();
  for (const m of matches) {
    const key = monthOf(m.endedAt);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[t.navTitle, { color: colors.text }]}>Match history</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[t.metaLabel, { color: colors.textFaint }]}>RECORD</Text>
            <Text style={[t.displayLg, { color: colors.text, fontSize: 22, marginTop: 4 }]}>
              {record.wins}-{record.losses}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[t.metaLabel, { color: colors.textFaint }]}>STREAK</Text>
            <Text
              style={[
                t.displayLg,
                { fontSize: 22, marginTop: 4, color: streak?.kind === 'L' ? colors.orangeB : colors.limeA },
              ]}
            >
              {streak ? `${streak.kind}${streak.count}` : '—'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[t.metaLabel, { color: colors.textFaint }]}>COURT TIME</Text>
            <Text style={[t.displayLg, { color: colors.text, fontSize: 22, marginTop: 4 }]}>
              {courtTime(matches)}
            </Text>
          </View>
        </View>

        {matches.length === 0 && (
          <Text style={[t.caption, { color: colors.textFaint, marginTop: space.xl }]}>
            No matches yet — play one from Home.
          </Text>
        )}

        {[...groups.entries()].map(([month, rows]) => (
          <View key={month} style={{ marginTop: space.xl }}>
            <Text style={[t.sectionCap, { color: colors.textFaint }]}>{month}</Text>
            <View style={{ marginTop: 10, gap: 10 }}>
              {rows.map((m) => {
                const isOpen = expanded === m.clientId;
                const state = replay(m.format, m.timeline);
                const myTeam = name ? m.teams.findIndex((team) => team.some((p) => p.displayName === name)) : -1;
                const oppTeam = myTeam === 0 ? 1 : 0;
                const badge =
                  m.status === 'abandoned' ? 'NO RESULT' : m.winner === myTeam ? 'WON' : 'LOST';
                return (
                  <Animated.View key={m.clientId} layout={LinearTransition} style={styles.matchCard}>
                    <Pressable
                      onPress={() => setExpanded(isOpen ? null : m.clientId)}
                      accessibilityRole="button"
                    >
                      <View style={styles.matchHeader}>
                        <View
                          style={[
                            styles.resultBadge,
                            m.status === 'abandoned'
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
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[t.bodySm, { color: colors.text }]} numberOfLines={1}>
                            vs {m.teams[oppTeam].map((p) => p.displayName).join(' & ')}
                          </Text>
                          <View style={styles.metaRow}>
                            <Text style={[t.micro, { color: colors.textFaint }]} numberOfLines={1}>
                              {new Date(m.endedAt).toDateString()} · {m.court}
                            </Text>
                            {!m.synced && <View style={styles.unsyncedDot} />}
                          </View>
                        </View>
                        <Text style={[t.bodySm, { color: colors.text, fontVariant: ['tabular-nums'] }]}>
                          {scoreline(state)}
                        </Text>
                      </View>

                      {isOpen && (
                        <View style={styles.expanded}>
                          <View style={styles.setRow}>
                            {state.sets.map((s, i) => (
                              <View key={i} style={styles.setCard}>
                                <Text style={[t.micro, { color: colors.textFaint }]}>SET {i + 1}</Text>
                                <Text style={[t.bodySm, { color: colors.text, marginTop: 4, fontVariant: ['tabular-nums'] }]}>
                                  {s.games[0]}-{s.games[1]}
                                </Text>
                              </View>
                            ))}
                          </View>
                          <Text style={[t.metaLabel, { color: colors.textFaint, marginTop: 12 }]}>
                            POINT BY POINT
                          </Text>
                          <View style={{ marginTop: 8 }}>
                            <PointTimeline timeline={state.timeline} barHeight={13} />
                          </View>
                          <View style={styles.durationRow}>
                            <View>
                              <Text style={[t.micro, { color: colors.textFaint }]}>DURATION</Text>
                              <Text style={[t.bodySm, { color: colors.text, marginTop: 3 }]}>
                                {formatDuration(m.startedAt, m.endedAt)}
                              </Text>
                            </View>
                            <View>
                              <Text style={[t.micro, { color: colors.textFaint }]}>COURT</Text>
                              <Text style={[t.bodySm, { color: colors.text, marginTop: 3 }]}>{m.court}</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.screenH, paddingTop: space.lg, paddingBottom: space.xl },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: space.lg },
  statCard: {
    flex: 1,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    padding: 12,
  },
  matchCard: { borderRadius: radius.zone, backgroundColor: colors.surface, padding: 15 },
  matchHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  unsyncedDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.textFaint },
  resultBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  resultBadgeOutline: { borderWidth: 1, borderColor: colors.hairline },
  expanded: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.hairline },
  setRow: { flexDirection: 'row', gap: 8 },
  setCard: { flex: 1, borderRadius: 11, backgroundColor: colors.surfaceSunken, padding: 10, alignItems: 'center' },
  durationRow: { flexDirection: 'row', gap: 18, marginTop: 12 },
});
