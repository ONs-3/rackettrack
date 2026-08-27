import React from 'react';
import { StyleSheet, View } from 'react-native';
import { layout, teamColor } from '@/theme/tokens';
import type { TeamIndex } from '@/features/scoring/types';

interface Props {
  timeline: TeamIndex[];
  /** Recap/history show all points and wrap; the live ticker slices to the last N itself. */
  barHeight?: number;
}

/** 4×N rounded bars, radius 2, gap 3, in team colours, chronological left to right, wrapping. */
export function PointTimeline({ timeline, barHeight = 18 }: Props) {
  return (
    <View style={styles.row}>
      {timeline.map((team, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: barHeight, backgroundColor: teamColor(team) },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.timelineBar.gap },
  bar: { width: layout.timelineBar.width, borderRadius: layout.timelineBar.radius },
});
