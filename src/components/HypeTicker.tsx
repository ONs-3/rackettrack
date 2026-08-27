import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, layout, motion, radius, space, teamColor, type as t } from '@/theme/tokens';
import type { Situation, TeamIndex } from '@/features/scoring/types';

interface Props {
  situation: Situation | null;
  /** Recent point winners, oldest first. Shown when nothing is at stake. */
  timeline: TeamIndex[];
  teamNames: [string, string];
  /** Changes on every point; re-triggers the snap animation. */
  popKey: number;
}

/**
 * The strip between the two team zones.
 *
 * Resting: a quiet bar of the last N points.
 * Ignited: solid team colour with the call ("MATCH POINT") and an arrow to whose it is.
 *
 * Keep this restrained. If it is lit more than ~20% of a match the hype stops
 * meaning anything — see 03-scoring-engine.md before adding a new situation.
 */
export function HypeTicker({ situation, timeline, teamNames, popKey }: Props) {
  const lit = situation !== null;
  const owner = situation?.team ?? null;

  const target = useDerivedValue(() =>
    withTiming(lit ? (owner === null ? 2 : owner === 0 ? 1 : 3) : 0, {
      duration: motion.tickerFill.duration,
      easing: Easing.out(Easing.quad),
    }),
  );

  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      target.value,
      [0, 1, 2, 3],
      [colors.surface, colors.limeA, colors.surface, colors.orangeB],
    ),
  }));

  const fg = owner === null ? colors.text : colors.onAccent;
  const recent = timeline.slice(-layout.tickerTimelineLength);

  return (
    <Animated.View style={[styles.bar, fillStyle]}>
      {lit ? (
        <Animated.View
          key={popKey}
          entering={FadeIn.duration(motion.snap.duration)}
          style={styles.litRow}
        >
          <Text style={[t.hype, { color: fg }]}>{situation!.label}</Text>
          {owner !== null && (
            <Text style={[t.metaLabel, { color: 'rgba(10,16,14,0.5)', letterSpacing: 1.6 }]}>
              {owner === 0 ? '↑' : '↓'} {teamNames[owner]}
            </Text>
          )}
        </Animated.View>
      ) : (
        <View style={styles.timelineRow}>
          {recent.map((team, i) => (
            <View key={i} style={[styles.tick, { backgroundColor: teamColor(team) }]} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    margin: space.zoneMargin,
    height: 46,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  litRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: layout.timelineBar.gap },
  tick: {
    width: layout.timelineBar.width,
    height: layout.timelineBar.height,
    borderRadius: layout.timelineBar.radius,
  },
});
