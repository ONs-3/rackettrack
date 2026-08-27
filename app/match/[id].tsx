import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListGroup } from '@/components/ListGroup';
import { ListRow } from '@/components/ListRow';
import { PointTimeline } from '@/components/PointTimeline';
import { colors, radius, space, type as t } from '@/theme/tokens';
import { getMatch } from '@/lib/archive';
import { replay, scoreline } from '@/features/scoring/engine';
import { finishStreakLine, formatDuration, whoWasAhead } from '@/features/match/stats';
import { useMatchStore } from '@/features/match/matchStore';

export default function RecapScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const startMatch = useMatchStore((s) => s.startMatch);

  const match = useMemo(() => (id ? getMatch(id) : null), [id]);
  const state = useMemo(() => (match ? replay(match.format, match.timeline) : null), [match]);

  if (!match || !state) {
    return <View style={[styles.root, { paddingTop: insets.top }]} />;
  }

  const abandoned = match.status === 'abandoned';
  const winner = match.winner;
  const winnerNames = winner !== null ? match.teams[winner].map((p) => p.displayName).join(' & ') : '';
  const ahead = abandoned ? whoWasAhead(state) : null;

  const back = () => router.replace('/');

  const rematch = () => {
    startMatch({
      squadId: match.squadId,
      format: match.format,
      court: match.court,
      teamA: match.teams[0],
      teamB: match.teams[1],
    });
    router.replace('/match/live');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button">
          <Text style={[t.navAction, { color: colors.limeA }]}>‹ Back</Text>
        </Pressable>
        <Text style={[t.navTitle, { color: colors.text, flex: 1, textAlign: 'center' }]}>Full time</Text>
        <Text style={[t.navAction, { color: 'transparent' }]}>‹ Back</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.centre}>
          <Text style={[t.metaLabel, { color: colors.textFaint }]}>
            {abandoned ? 'NO RESULT' : `FULL TIME · ${match.court}`}
          </Text>
          <Text style={[t.displayLg, { color: colors.text, marginTop: 10, textAlign: 'center' }]}>
            {abandoned ? 'Match abandoned' : winnerNames}
          </Text>
          <View style={styles.pill}>
            <Text style={[t.recapScore, { color: colors.onAccent }]}>
              {scoreline(state)}
            </Text>
          </View>
        </View>

        <ListGroup style={{ marginTop: space.xl }}>
          <ListRow label="Duration">
            <Text style={[t.bodySm, { color: colors.text }]}>{formatDuration(match.startedAt, match.endedAt)}</Text>
          </ListRow>
          <ListRow label="Points played">
            <Text style={[t.bodySm, { color: colors.text, fontVariant: ['tabular-nums'] }]}>{state.timeline.length}</Text>
          </ListRow>
          <ListRow label="Finish">
            <Text style={[t.bodySm, { color: colors.text }]} numberOfLines={1}>
              {abandoned
                ? ahead !== null
                  ? `${match.teams[ahead].map((p) => p.displayName).join(' & ')} were ahead`
                  : 'Scores were level'
                : finishStreakLine(state)}
            </Text>
          </ListRow>
        </ListGroup>

        <Text style={[t.sectionCap, { color: colors.textFaint, marginTop: space.xl, paddingLeft: 4 }]}>
          POINT BY POINT
        </Text>
        <View style={styles.timelineCard}>
          <PointTimeline timeline={state.timeline} />
        </View>
      </ScrollView>

      <Pressable onPress={rematch} accessibilityRole="button" style={styles.rematch}>
        <Text style={[t.body, { color: colors.onAccent, fontWeight: '700' }]}>Rematch</Text>
      </Pressable>
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
  content: { paddingHorizontal: space.screenH, paddingTop: space.lg },
  centre: { alignItems: 'center' },
  pill: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.limeA,
  },
  timelineCard: {
    marginTop: 10,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    padding: 16,
  },
  rematch: {
    marginHorizontal: space.screenH,
    height: 58,
    borderRadius: radius.button,
    backgroundColor: colors.limeA,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
