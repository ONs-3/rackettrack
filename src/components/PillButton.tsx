import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, layout, motion, radius, type as t } from '@/theme/tokens';

interface Props {
  label: string;
  onPress(): void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one solid button per screen — full width, height 58, radius 29, lime.
 * Never pair two of these; a secondary action is nav-bar text (05-design-tokens.md).
 */
export function PillButton({ label, onPress, disabled, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        style,
        { opacity: disabled ? motion.press.opacity - 0.45 : pressed ? motion.press.opacity : 1 },
      ]}
    >
      <Text style={[t.body, styles.label]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: layout.buttonHeight,
    borderRadius: radius.button,
    backgroundColor: colors.limeA,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  // adjustsFontSizeToFit is unreliable on Android/Fabric — 15 rather than
  // body's 16 is the deterministic fix that fits "Continue with Google" at
  // full width, verified on-device.
  label: { color: colors.onAccent, fontWeight: '700', fontSize: 15 },
});
