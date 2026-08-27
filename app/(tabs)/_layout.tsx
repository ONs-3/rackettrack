import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space, type as t } from '@/theme/tokens';

/**
 * Text-only tab bar — "HOME" / "HISTORY" — matching the app's minimal nav
 * vocabulary (no icons, no Material bottom bar; 04-screens.md rule 4).
 */
function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 14 }]}>
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const label = route.name === 'index' ? 'HOME' : 'HISTORY';
        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={styles.item}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
          >
            <Text style={[t.metaLabel, { color: focused ? colors.limeA : colors.textFaint }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: space.sm,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.bg,
  },
  item: { flex: 1, alignItems: 'center' },
});
