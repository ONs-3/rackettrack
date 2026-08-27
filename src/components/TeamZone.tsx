import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  colors,
  layout,
  motion,
  radius,
  space,
  teamColor,
  teamFaint,
  teamMuted,
  teamPipEmpty,
  teamZone,
  type as t,
} from '@/theme/tokens';
import type { TeamIndex } from '@/features/scoring/types';

interface Props {
  team: TeamIndex;
  name: string;
  partners: string;
  score: string;
  gamesWon: number;
  setsWon: number;
  /** Changes on every point; drives the pop animation. */
  popKey: number;
  /** This team is one point from a game, set, or match. Drives the side wash. */
  atStake: boolean;
  onPress(): void;
}

export function TeamZone({
  team, name, partners, score, gamesWon, setsWon, popKey, atStake, onPress,
}: Props) {
  const scale = useSharedValue(1);
  const wash = useSharedValue(0);

  useEffect(() => {
    if (popKey === 0) return;
    scale.value = withSequence(
      withTiming(motion.pop.from, { duration: 0 }),
      withTiming(motion.pop.overshoot, { duration: motion.pop.duration * 0.6, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: motion.pop.duration * 0.4, easing: Easing.out(Easing.quad) }),
    );
  }, [popKey, scale]);

  useEffect(() => {
    if (atStake) {
      wash.value = withRepeat(
        withSequence(
          withTiming(motion.flash.max, { duration: motion.flash.duration / 2, easing: Easing.inOut(Easing.quad) }),
          withTiming(motion.flash.min, { duration: motion.flash.duration / 2, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      wash.value = withTiming(0, { duration: motion.tickerFill.duration });
    }
  }, [atStake, wash]);

  const numeralStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value }));

  const accent = teamColor(team);
  const pips = Array.from({ length: layout.pip.perSet }, (_, i) => i < gamesWon);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Award point to ${name}`}
      style={({ pressed }) => [
        styles.zone,
        { backgroundColor: teamZone(team), opacity: pressed ? motion.press.opacity : 1 },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: accent }, washStyle]}
      />

      <View style={styles.meta}>
        <Text style={[t.label, { color: accent }]} numberOfLines={1}>{name}</Text>
        <Text style={[t.caption, { color: teamMuted(team), marginTop: 3 }]} numberOfLines={1}>
          {partners}
        </Text>

        <View style={styles.pipRow}>
          {pips.map((filled, i) => (
            <View
              key={i}
              style={[styles.pip, { backgroundColor: filled ? accent : teamPipEmpty(team) }]}
            />
          ))}
        </View>

        <Text style={[t.metaLabel, { color: teamFaint(team), marginTop: 9 }]}>
          SETS {setsWon}
        </Text>
      </View>

      <Animated.Text style={[t.scoreNumeral, { color: colors.text }, numeralStyle]}>
        {score}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zone: {
    flex: 1,
    marginHorizontal: space.zoneMargin,
    borderRadius: radius.zone,
    paddingHorizontal: space.zoneH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  meta: { flexShrink: 1 },
  pipRow: { flexDirection: 'row', gap: layout.pip.gap, marginTop: 12 },
  pip: { width: layout.pip.size, height: layout.pip.size, borderRadius: layout.pip.radius },
});
