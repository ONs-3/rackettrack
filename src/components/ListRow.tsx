import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, space, type as t } from '@/theme/tokens';

interface Props {
  label: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}

/** Row: label left at 16, value or control right. */
export function ListRow({ label, children, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={[t.body, { color: colors.text, flexShrink: 0, marginRight: 12 }]}>{label}</Text>
      <View style={styles.value}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.rowH,
    paddingVertical: space.rowV,
  },
  value: { flex: 1, alignItems: 'flex-end' },
});
