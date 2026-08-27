import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { TeamZone } from '@/components/TeamZone';
import { HypeTicker } from '@/components/HypeTicker';
import {
  selectPartners,
  selectPopKey,
  selectSituation,
  selectTeamNames,
  useMatchStore,
} from '@/features/match/matchStore';
import { pointLabel } from '@/features/scoring/engine';
import { colors, layout, motion, radius, space, type as t } from '@/theme/tokens';
import type { TeamIndex } from '@/features/scoring/types';
import { useElapsed } from '@/features/match/useElapsed';
import { enqueueMatch } from '@/lib/outbox';
import { saveMatch } from '@/lib/archive';

/**
 * The core screen. Design 2b.
 *
 * Layout, top to bottom:
 *   nav bar (Done / games + timer / Undo)
 *   team A zone            flex: 1
 *   hype ticker            height 46
 *   team B zone            flex: 1
 *   bottom inset
 */
export default function LiveMatchScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const live = useMatchStore((s) => s.live);
  const state = useMatchStore((s) => s.state);
  const award = useMatchStore((s) => s.awardPoint);
  const undo = useMatchStore((s) => s.undo);
  const end = useMatchStore((s) => s.end);

  // situation()/selectTeamNames build a new object/array on every call, and
  // Zustand v5's useSyncExternalStore needs a stable snapshot reference to
  // avoid re-subscribing forever — useShallow caches by shallow equality.
  const situation = useMatchStore(useShallow(selectSituation));
  const teamNames = useMatchStore(useShallow(selectTeamNames));
  const popKey = useMatchStore(selectPopKey);
  const partnersA = useMatchStore((s) => selectPartners(s, 0));
  const partnersB = useMatchStore((s) => selectPartners(s, 1));

  const elapsed = useElapsed(live?.startedAt ?? null, state.status === 'live');
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Feedback intensity scales with what the point was worth. The phone is often
  // out of the scorer's eyeline, so touch is the primary confirmation channel.
  const onPoint = useCallback(
    (team: TeamIndex) => {
      const before = state;
      award(team);
      const after = useMatchStore.getState().state;

      if (after.status === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 120);
      } else if (after.sets.length > before.sets.length) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (after.games[team] > before.games[team]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [award, state],
  );

  const onUndo = useCallback(() => {
    Haptics.selectionAsync();
    undo();
  }, [undo]);

  const finish = useCallback(() => {
    const result = end();
    const current = useMatchStore.getState().live;
    if (result && current) {
      const finalState = useMatchStore.getState().state;
      saveMatch(current, finalState, result.status);
      enqueueMatch(current, finalState, result.status);
      router.replace(`/match/${current.clientId}`);
    } else {
      router.back();
    }
  }, [end]);

  // The match ended itself. Let the win land, then move to the recap.
  useEffect(() => {
    if (state.status !== 'complete') return;
    const timer = setTimeout(finish, 1000);
    return () => clearTimeout(timer);
  }, [state.status, finish]);

  // A match lost to an accidental back swipe is the worst bug this app can ship —
  // hardware/gesture back must never silently discard a live match (04-screens.md).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.timeline.length > 0 && state.status !== 'complete') {
        setConfirmEnd(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [state.timeline.length, state.status]);

  // Announce every point for screen-reader users — the two-zone layout is
  // otherwise silent about what just happened.
  useEffect(() => {
    if (state.timeline.length === 0) return;
    AccessibilityInfo.announceForAccessibility(
      `${teamNames[0]} ${pointLabel(state, 0)}, ${teamNames[1]} ${pointLabel(state, 1)}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timeline.length]);

  const gamesLabel = useMemo(() => `${state.games[0]}-${state.games[1]}`, [state.games]);

  // Defensive: this screen only makes sense with an active match. Redirect
  // rather than leave the user stranded on a blank screen with nothing to
  // tap — reachable only via a stale route restore, never the normal flow.
  useEffect(() => {
    if (!live) router.replace('/');
  }, [live]);

  if (!live) return null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Modal visible={confirmEnd} transparent animationType="fade" onRequestClose={() => setConfirmEnd(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={[t.navTitle, { color: colors.text, marginBottom: 6 }]}>End this match?</Text>
            <Text style={[t.caption, { color: colors.textMuted, marginBottom: space.lg }]}>
              The score so far will be kept, but the match will not have a winner.
            </Text>
            <Pressable
              onPress={() => {
                setConfirmEnd(false);
                finish();
              }}
              accessibilityRole="button"
              style={styles.sheetButton}
            >
              <Text style={[t.navAction, { color: colors.orangeB }]}>End match</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmEnd(false)}
              accessibilityRole="button"
              style={styles.sheetButton}
            >
              <Text style={[t.navAction, { color: colors.limeA }]}>Keep scoring</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.nav}>
        <Pressable onPress={finish} hitSlop={12} accessibilityRole="button">
          <Text style={[t.navAction, { color: colors.limeA }]}>Done</Text>
        </Pressable>

        <View style={styles.navCentre}>
          <Text style={[t.navTitle, { color: colors.text, fontVariant: ['tabular-nums'] }]}>
            {gamesLabel}
          </Text>
          <Text style={[t.micro, { color: colors.textFaint, marginTop: 1 }]} numberOfLines={1}>
            {elapsed} · {live.court}
          </Text>
        </View>

        {state.timeline.length > 0 ? (
          <Pressable onPress={onUndo} hitSlop={12} accessibilityRole="button">
            <Text style={[t.navAction, { color: colors.textDim }]}>Undo</Text>
          </Pressable>
        ) : (
          // Transparent spacer keeps the centre title optically centred.
          <Text style={[t.navAction, { color: 'transparent' }]}>Undo</Text>
        )}
      </View>

      <TeamZone
        team={0}
        name={teamNames[0]}
        partners={partnersA}
        score={pointLabel(state, 0)}
        gamesWon={state.games[0]}
        setsWon={state.setsWon[0]}
        popKey={popKey}
        atStake={situation?.team === 0}
        onPress={() => onPoint(0)}
      />

      <HypeTicker
        situation={situation}
        timeline={state.timeline}
        teamNames={teamNames}
        popKey={popKey}
      />

      <TeamZone
        team={1}
        name={teamNames[1]}
        partners={partnersB}
        score={pointLabel(state, 1)}
        gamesWon={state.games[1]}
        setsWon={state.setsWon[1]}
        popKey={popKey}
        atStake={situation?.team === 1}
        onPress={() => onPoint(1)}
      />

      <View style={{ height: insets.bottom + space.bottomInset }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,16,14,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: space.xl,
    paddingBottom: space.xxl,
  },
  sheetButton: { paddingVertical: space.md },
  nav: {
    height: layout.navHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
  },
  navCentre: { flex: 1, alignItems: 'center' },
});
