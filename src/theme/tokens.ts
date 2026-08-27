/**
 * Design tokens for RacketTrack, taken verbatim from design 2b.
 * Import from here. Never hardcode a colour or a size in a component.
 */

export const colors = {
  bg: '#0A100E',
  surface: '#141E19',
  surfaceSunken: '#0F1714',
  zoneA: '#16221D',
  zoneB: '#221A16',
  hairline: '#1E2B25',
  pipEmptyA: '#243024',
  pipEmptyB: '#33241D',

  limeA: '#D6FF4B',
  orangeB: '#FF6B3D',

  text: '#F1F5F2',
  textMuted: '#8B9A92',
  textDim: '#7E8C84',
  textFaint: '#5F6E66',
  textMutedB: '#9A8A82',
  textFaintB: '#5C4B43',
  onAccent: '#0A100E',
} as const;

/** Team A is always lime, team B is always orange. Everywhere, without exception. */
export const teamColor = (team: 0 | 1) => (team === 0 ? colors.limeA : colors.orangeB);
export const teamZone = (team: 0 | 1) => (team === 0 ? colors.zoneA : colors.zoneB);
export const teamPipEmpty = (team: 0 | 1) => (team === 0 ? colors.pipEmptyA : colors.pipEmptyB);
export const teamMuted = (team: 0 | 1) => (team === 0 ? colors.textDim : colors.textMutedB);
export const teamFaint = (team: 0 | 1) => (team === 0 ? colors.textFaint : colors.textFaintB);

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screenH: 20,
  zoneH: 24,
  zoneMargin: 10,
  rowH: 16,
  rowV: 15,
  bottomInset: 36,
} as const;

export const radius = {
  segment: 9,
  card: 14,
  pill: 16,
  zone: 22,
  button: 29,
} as const;

export const fonts = {
  body: 'Archivo_400Regular',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  /** Static Archivo Expanded. Score numerals and hype text only. */
  display: 'ArchivoExpanded_800ExtraBold',
} as const;

const tabular = { fontVariant: ['tabular-nums' as const] };

export const type = {
  scoreNumeral: { fontFamily: fonts.display, fontSize: 130, lineHeight: 107, letterSpacing: -7.8, ...tabular },
  hype: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, letterSpacing: 0.4 },
  recapScore: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, ...tabular },
  displayLg: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, letterSpacing: -1.1 },
  navTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  navAction: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 21 },
  bodySm: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 17 },
  label: { fontFamily: fonts.display, fontSize: 13, lineHeight: 16, letterSpacing: 1.3 },
  sectionCap: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15 },
  micro: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 14 },
  metaLabel: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9 },
} as const;

export const motion = {
  pop: { duration: 200, from: 0.72, overshoot: 1.06 },
  snap: { duration: 220, translateY: 8, from: 0.96 },
  flash: { duration: 1100, min: 0.05, max: 0.16 },
  tickerFill: { duration: 200 },
  press: { duration: 80, opacity: 0.85 },
} as const;

export const layout = {
  buttonHeight: 58,
  navHeight: 44,
  toggleTrack: { width: 48, height: 29, radius: 15 },
  toggleKnob: { size: 23, radius: 12, inset: 3 },
  pip: { size: 9, radius: 5, gap: 5, perSet: 6 },
  timelineBar: { width: 4, height: 14, radius: 2, gap: 3 },
  /** How many recent points the live ticker shows when nothing is at stake. */
  tickerTimelineLength: 14,
} as const;
