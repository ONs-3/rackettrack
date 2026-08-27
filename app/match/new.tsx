import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListGroup } from '@/components/ListGroup';
import { PillButton } from '@/components/PillButton';
import { colors, radius, space, type as t } from '@/theme/tokens';
import { useMatchStore } from '@/features/match/matchStore';
import { resolvePlayer } from '@/features/squad/localRoster';
import { getCachedSquad } from '@/features/squad/currentSquad';

const DEFAULT_COURT = 'Court 3 · Padel Ireland';

export default function NewMatchScreen() {
  const insets = useSafeAreaInsets();
  const startMatch = useMatchStore((s) => s.startMatch);

  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [b1, setB1] = useState('');
  const [b2, setB2] = useState('');
  const [bestOf, setBestOf] = useState<1 | 3>(3);
  const [goldenPoint, setGoldenPoint] = useState(true);
  const [court, setCourt] = useState('');

  const cancel = () => router.back();

  const start = () => {
    // Validation is deliberately thin — nobody should be blocked from starting
    // a match by a form (04-screens.md).
    const teamA = [resolvePlayer(a1 || 'Player 1'), resolvePlayer(a2 || 'Player 2')];
    const teamB = [resolvePlayer(b1 || 'Player 3'), resolvePlayer(b2 || 'Player 4')];

    startMatch({
      // A cached squad (read synchronously — no network call on the critical
      // path of starting a match) means the finished match syncs automatically;
      // no squad yet means guest mode, exactly as before.
      squadId: getCachedSquad()?.id ?? null,
      format: { bestOf, goldenPoint },
      court: court.trim() || DEFAULT_COURT,
      teamA,
      teamB,
    });
    router.replace('/match/live');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable onPress={cancel} hitSlop={12} accessibilityRole="button">
          <Text style={[t.navAction, { color: colors.limeA }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.navTitle, { color: colors.text, flex: 1, textAlign: 'center' }]}>New match</Text>
        <Text style={[t.navAction, { color: 'transparent' }]}>Cancel</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[t.sectionCap, styles.cap]}>TEAM A</Text>
        <ListGroup>
          <TextInput
            value={a1}
            onChangeText={setA1}
            placeholder="Player 1"
            placeholderTextColor={colors.textFaint}
            style={[t.body, styles.input, { color: colors.text }]}
          />
          <TextInput
            value={a2}
            onChangeText={setA2}
            placeholder="Player 2"
            placeholderTextColor={colors.textFaint}
            style={[t.body, styles.input, { color: colors.text }]}
          />
        </ListGroup>

        <Text style={[t.sectionCap, styles.cap, { marginTop: space.xl }]}>TEAM B</Text>
        <ListGroup>
          <TextInput
            value={b1}
            onChangeText={setB1}
            placeholder="Player 3"
            placeholderTextColor={colors.textFaint}
            style={[t.body, styles.input, { color: colors.text }]}
          />
          <TextInput
            value={b2}
            onChangeText={setB2}
            placeholder="Player 4"
            placeholderTextColor={colors.textFaint}
            style={[t.body, styles.input, { color: colors.text }]}
          />
        </ListGroup>

        <Text style={[t.sectionCap, styles.cap, { marginTop: space.xl }]}>RULES</Text>
        <ListGroup>
          <View style={styles.row}>
            <Text style={[t.body, { color: colors.text, flex: 1 }]}>Sets</Text>
            <View style={styles.segment}>
              <Pressable onPress={() => setBestOf(3)} style={[styles.segmentItem, bestOf === 3 && styles.segmentItemActive]}>
                <Text style={[t.bodySm, { color: bestOf === 3 ? colors.onAccent : colors.textDim }]}>3</Text>
              </Pressable>
              <Pressable onPress={() => setBestOf(1)} style={[styles.segmentItem, bestOf === 1 && styles.segmentItemActive]}>
                <Text style={[t.bodySm, { color: bestOf === 1 ? colors.onAccent : colors.textDim }]}>1</Text>
              </Pressable>
            </View>
          </View>

          <Pressable onPress={() => setGoldenPoint((v) => !v)} style={styles.row} accessibilityRole="switch" accessibilityState={{ checked: goldenPoint }}>
            <Text style={[t.body, { color: colors.text, flex: 1 }]}>Golden point</Text>
            <View style={[styles.toggleTrack, { backgroundColor: goldenPoint ? colors.limeA : colors.pipEmptyA }]}>
              <View style={[styles.toggleKnob, goldenPoint && styles.toggleKnobOn, { backgroundColor: goldenPoint ? colors.bg : colors.textFaint }]} />
            </View>
          </Pressable>

          <View style={styles.row}>
            <Text style={[t.body, { color: colors.text }]}>Court</Text>
            <TextInput
              value={court}
              onChangeText={setCourt}
              placeholder={DEFAULT_COURT}
              placeholderTextColor={colors.textFaint}
              style={[t.body, { color: colors.textDim, flex: 1, textAlign: 'right' }]}
            />
          </View>
        </ListGroup>
      </ScrollView>

      <PillButton label="Start match" onPress={start} style={styles.button} />
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
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.screenH, paddingTop: space.xl },
  cap: { color: colors.textFaint, paddingLeft: 4 },
  input: { paddingHorizontal: 16, paddingVertical: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.rowH,
    paddingVertical: space.rowV,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.segment,
    padding: 3,
  },
  segmentItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 7 },
  segmentItemActive: { backgroundColor: colors.limeA },
  toggleTrack: { width: 48, height: 29, borderRadius: 15, padding: 3, justifyContent: 'center' },
  toggleKnob: { width: 23, height: 23, borderRadius: 12 },
  toggleKnobOn: { alignSelf: 'flex-end' },
  button: { marginHorizontal: space.screenH },
});
