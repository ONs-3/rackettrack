import {
  useFonts,
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';

/**
 * Static Archivo faces plus the Expanded static cut used only for score
 * numerals and hype text (05-design-tokens.md — RN can't set variable-font
 * width axes, so this is a fixed instance rather than the HTML's variable font).
 */
export function useAppFonts() {
  return useFonts({
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_700Bold,
    ArchivoExpanded_800ExtraBold: require('../../assets/fonts/ArchivoExpanded_800ExtraBold.ttf'),
  });
}
