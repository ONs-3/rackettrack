import React, { Children, isValidElement } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius } from '@/theme/tokens';

/**
 * Card `surface`, radius 14, rows separated by a 1pt hairline inset 16 on the
 * left. The whole settings vocabulary — resist bordered cards or coloured
 * section headers (05-design-tokens.md).
 */
export function ListGroup({ children, style, ...rest }: ViewProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.group, style]} {...rest}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {row}
          {i < rows.length - 1 && <View style={styles.hairline} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.card, backgroundColor: colors.surface, overflow: 'hidden' },
  hairline: { height: 1, backgroundColor: colors.hairline, marginLeft: 16 },
});
