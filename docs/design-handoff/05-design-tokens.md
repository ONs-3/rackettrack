# 05 — Design tokens

Everything here is lifted from design **2b** and is exact. `starter/src/theme/tokens.ts` is the
machine-readable copy — import from there, never hardcode a hex in a component.

## Colour

### Surfaces

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0A100E` | App background, every screen |
| `surface` | `#141E19` | Grouped list cards, the resting ticker |
| `surfaceSunken` | `#0F1714` | Inset segmented-control track |
| `zoneA` | `#16221D` | Team A tap zone |
| `zoneB` | `#221A16` | Team B tap zone |
| `hairline` | `#1E2B25` | 1pt separators inside list groups |
| `pipEmptyA` | `#243024` | Unwon game pips, team A. Also the "off" toggle track |
| `pipEmptyB` | `#33241D` | Unwon game pips, team B |

### Accents

| Token | Hex | Use |
|---|---|---|
| `limeA` | `#D6FF4B` | Team A identity, primary button, active toggle, all links |
| `orangeB` | `#FF6B3D` | Team B identity |

Team A is always lime, team B is always orange, on every screen. This is the app's core
wayfinding — a user should be able to tell whose point it is from across a court without reading.
Never use lime for team B's data or vice versa.

### Text

| Token | Hex | Use |
|---|---|---|
| `text` | `#F1F5F2` | Primary text, numerals |
| `textMuted` | `#8B9A92` | Secondary rows, labels on dark |
| `textDim` | `#7E8C84` | Team A partner names, tertiary |
| `textFaint` | `#5F6E66` | Section captions, timestamps, disabled |
| `textMutedB` | `#9A8A82` | Team B partner names (warm-shifted mute) |
| `textFaintB` | `#5C4B43` | Team B tertiary (warm-shifted faint) |
| `onAccent` | `#0A100E` | Text on lime or orange fills |

The warm-shifted mutes on team B's side are deliberate — a neutral grey next to orange reads green.

## Typography

**Family: Archivo.** The HTML uses the variable font's `wdth` axis to condense/expand. React Native
cannot set variable-font axes reliably, so ship static faces:

| Face | File | Where |
|---|---|---|
| `Archivo_600SemiBold` | `@expo-google-fonts/archivo` | Body, list rows, buttons |
| `Archivo_700Bold` | `@expo-google-fonts/archivo` | Headings, team names |
| `ArchivoExpanded_800ExtraBold` | Download the Expanded static from Google Fonts into `assets/fonts/` | **Score numerals and hype text only** |

The Expanded face is what makes the giant numerals read as sporty rather than generic. Do not
substitute the regular-width bold and expect it to look right.

### Presets

| Preset | Size / Line height | Weight & face | Letter spacing | Where |
|---|---|---|---|---|
| `scoreNumeral` | 130 / 107 | Expanded 800 | −7.8 (−0.06em) | Live screen team score |
| `hype` | 22 / 26 | Expanded 800 | +0.4 | Ticker text |
| `recapScore` | 32 / 36 | Expanded 800 | 0 | Recap scoreline pill |
| `displayLg` | 36 / 40 | Expanded 800 | −1.1 (−0.03em) | Recap winner name |
| `navTitle` | 17 / 22 | Bold 700 | 0 | Nav bar centre title |
| `navAction` | 17 / 22 | SemiBold 600 | 0 | Cancel / Done / Undo |
| `body` | 16 / 21 | Regular 400–600 | 0 | List rows, inputs |
| `bodySm` | 15 / 20 | SemiBold 600 | 0 | List row values |
| `caption` | 13 / 17 | Regular 400 | 0 | Partner names, subtitles |
| `label` | 13 / 16 | ExtraBold 800 | +1.3 (0.1em) | TEAM A / TEAM B |
| `sectionCap` | 12 / 15 | SemiBold 600 | 0 | TEAM A / RULES section captions |
| `micro` | 11.5 / 14 | Regular 400 | 0 | Timer, court line |
| `metaLabel` | 11 / 14 | Bold 700 | +0.9 (0.08em) | SETS 1 |

All numerals — every score, every count, the timer — must set `fontVariant: ['tabular-nums']`.
Without it the score visibly jitters as digits change and the whole screen feels cheap.

**Android caveat, verify this in phase 2:** `fontVariant` on Android only works if the font file
actually ships the `tnum` OpenType feature, and support has historically been patchy in React Native.
Render `40` → `15` → `30` in sequence and watch for horizontal shift. If it shifts, fall back to a
fixed-width container per digit:

```tsx
// Each digit in an equal-width cell. Ugly, reliable, invisible to the user.
{score.split('').map((ch, i) => (
  <View key={i} style={{ width: 72, alignItems: 'center' }}>
    <Text style={type.scoreNumeral}>{ch}</Text>
  </View>
))}
```

Do not skip this check. A jittering scoreboard is the most noticeable possible defect on this screen.

## Spacing

Base unit 2, working scale: **4, 6, 8, 10, 12, 14, 16, 20, 22, 24, 26, 28, 36**.

Fixed layout values from 2b:

| Value | Where |
|---|---|
| 20 | Horizontal screen padding on setup and recap |
| 10 | Horizontal margin on live-screen zones (they sit wider than content screens, deliberately) |
| 16 | List row horizontal padding |
| 15 | List row vertical padding |
| 24 | Live zone horizontal padding |
| 36 | Bottom inset above the home indicator on primary buttons |

## Radii

| Value | Where |
|---|---|
| 9 | Segmented control pill (inner) |
| 14 | List group cards, the ticker |
| 16 | Recap scoreline pill |
| 22 | Live team zones |
| 29 | Primary action button (height 58 → fully rounded) |

## Components

### Primary button

Full-width, height **58**, radius **29**, fill `limeA`, label `onAccent` at 17/600, sentence case
("Start match", "Rematch"). **One per screen, at the bottom, above a 36pt inset.** Never two solid
buttons side by side; a secondary action is a text link in the nav bar.

Pressed state: `opacity 0.85`, 80ms. Disabled: `opacity 0.4`, no press feedback.

### Nav bar

Height 44 above the safe-area inset. Left and right slots are **plain text**, 17/600, `limeA` for
the live action and `textDim` for a secondary one. Centre title 17/700 `text`. **No chevrons, no
circles, no outlined buttons, no icon buttons.** The right slot is padded with a transparent copy of
the left label so the centre title stays optically centred.

### Grouped list

Card `surface`, radius 14, rows separated by a 1pt `hairline` **inset by 16 on the left** and flush
right. Row: label left at 16, value or control right. This is the whole settings vocabulary — resist
adding bordered cards or coloured section headers.

### Toggle

Track 48×29, radius 15. On: `limeA` track, `bg` knob. Off: `pipEmptyA` track, `textFaint` knob.
Knob 23×23, radius 12, 3pt inset.

### Segmented control

Track `surfaceSunken`, radius 9, 3pt padding. Selected segment `limeA` fill with `onAccent` 13/700;
unselected transparent with `textDim` 13/600.

### Game pips

9×9 circles, radius 5, gap 5. Filled in team colour for games won this set, `pipEmptyA` /
`pipEmptyB` for the remainder. Always render six.

### Point timeline

4×14 rounded bars, radius 2, gap 3, in team colours, chronological left to right. On the live ticker
show the **last 14 points**; on recap show **all** points and wrap.

## Motion

| Name | Spec | Trigger |
|---|---|---|
| `pop` | scale 0.72 → 1.06 → 1.0, 200ms, ease-out | Score numeral changes |
| `snap` | translateY 8 → 0 + scale 0.96 → 1, opacity 0 → 1, 220ms, ease-out | Hype text enters the ticker |
| `flash` | opacity 0.16 ↔ 0.05, 1100ms, ease-in-out, infinite | Side wash on the team facing a big point |
| `tickerFill` | background colour cross-fade, 200ms | Ticker igniting or cooling |
| `press` | opacity → 0.85, 80ms | Any pressable |

Implement all of these with Reanimated 3 (`withSequence`, `withTiming`, `withRepeat`). Do not use
`Animated` from `react-native` — it runs on the JS thread and the score pop will drop frames while
the store persists.

Drive `pop` off a key derived from total points played, not off the score string: "40" following
"40" after a deuce reset must still animate.

## Haptics — not in the HTML, required on device

The phone is often out of the scorer's eyeline. Touch is the confirmation channel.

| Event | `expo-haptics` call |
|---|---|
| Point awarded | `impactAsync(Light)` |
| Game won | `impactAsync(Medium)` |
| Set won | `notificationAsync(Success)` |
| Match won | `notificationAsync(Success)` ×2, 120ms apart |
| Undo | `selectionAsync()` |

**Android haptics are coarser than iOS.** The Light/Medium/Heavy distinction maps onto a smaller set
of underlying effects and varies by OEM — on some budget devices Light and Medium feel identical.
Verify the four levels are actually distinguishable on your test device; if they are not, widen the
gaps (Light → Medium → Heavy → double Heavy) so a game win never feels like an ordinary point.

Vibration does not work in the emulator at all. This is a real-device check only.

Also add `android.permission.VIBRATE` — Expo includes it by default, but if you trim permissions for
release (see `08`) do not trim that one.

## Screen behaviour

`useKeepAwake()` from `expo-keep-awake` must be active for the entire live match screen and released
on unmount. A scoreboard that sleeps between points is not a scoreboard.

On Android also colour the status and navigation bars to `colors.bg` — see the Android platform rules
in `04-screens.md`. Leaving them default puts a grey band above and below an otherwise full-bleed
dark design, which is the single most obvious sign of an unfinished Android port.
