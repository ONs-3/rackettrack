# 04 — Screens

Build spec for design **2b**. Open `Padel Score Tracker.dc.html` alongside this document; the phone
labelled 2b is the target and it is interactive.

Global rules for every screen:

- Background is always `colors.bg`. There is no light mode in v1.
- Top spacing comes from `useSafeAreaInsets().top`, never a hardcoded 58.
- Exactly one solid button per screen, at the bottom, above a 36pt inset.
- Secondary actions are plain text in the nav bar. No outlined buttons, no icon buttons, no chevrons.
- Every number renders with `fontVariant: ['tabular-nums']`.

## Android platform rules

The design was mocked in an iPhone frame; the target is Android. Four things need attention, and none
of them changes the visual design.

**1. Hardware and gesture back.** Android has a global back affordance that iOS does not. Handle it
per screen:

| Screen | Back behaviour |
|---|---|
| Live match | **Intercept.** Show a confirm sheet: "End this match?" / "Keep scoring". Never discard silently |
| New match | Same as Cancel — dismiss the modal, keep nothing |
| Recap | Go home. It is a terminal screen, not a step in a flow |
| History / Home | Default (exit the app from the root tab) |

```ts
useEffect(() => {
  const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    if (state.timeline.length > 0) { setConfirmEnd(true); return true; }
    return false;
  });
  return () => sub.remove();
}, [state.timeline.length]);
```

A match lost to an accidental back swipe is the worst bug this app could ship. Test it deliberately.

**2. System bars.** Draw edge-to-edge and colour both bars to match `colors.bg` so the app does not
sit in a grey letterbox:

```ts
// app/_layout.tsx
import * as NavigationBar from 'expo-navigation-bar';
NavigationBar.setBackgroundColorAsync(colors.bg);
NavigationBar.setButtonStyleAsync('light');
// app.json: android.navigationBar.backgroundColor, statusBar.style: 'light'
```

On devices with gesture navigation the bottom inset is small; on three-button devices it is ~48dp.
The 36pt button inset is *in addition* to `insets.bottom` — use both, or the button collides with the
nav bar on older phones.

**3. Press feedback.** Android users expect ripple. Use it on list rows and buttons via
`android_ripple={{ color: 'rgba(255,255,255,0.08)' }}`. **Do not** put ripple on the two team zones —
at that size a ripple reads as a glitch, and the score pop plus haptic already confirm the tap. Keep
the opacity press there.

**4. Nav bar convention.** The design's text-only `Cancel` / `Done` nav is not the Android norm, but
it is deliberate and it works — keep it. It is legible, it needs no icon set, and it matches the
app's minimal vocabulary. Do not swap in a Material top app bar with an overflow menu.

---

## 1. Live scoreboard — `app/match/live.tsx`

**The screen the product lives or dies on.** Build it first, after the engine.

`starter/app/match/live.tsx` is a working implementation. What follows is why it is shaped that way.

### Layout

```
safe-area top
┌─────────────────────────────────────────┐  nav, height 44
│ Done            2-1            Undo     │  17/600 lime | 17/700 centred | 17/600 dim
│                12:34 · Court 3          │  11.5 faint, one line, truncating
├─────────────────────────────────────────┤
│                                         │
│  TEAM A                             40  │  flex: 1, radius 22, margin 10
│  Cian · Aoife                           │  score right-aligned, 130pt Expanded
│  ● ● ● ○ ○ ○                            │
│  SETS 1                                 │
├─────────────────────────────────────────┤  ticker, height 46, radius 14, margin 10
│         ▍▍▍▍▍▍▍▍▍▍▍▍▍▍                  │
├─────────────────────────────────────────┤
│  TEAM B                             30  │  flex: 1
│  Rob · Sinéad                           │
│  ● ○ ○ ○ ○ ○                            │
│  SETS 0                                 │
└─────────────────────────────────────────┘
                 36pt inset
```

The two zones are `flex: 1` siblings, so they split whatever space remains after the nav and the
ticker. On a 6.7" iPhone each is ~330pt tall; on an SE ~250pt. Both are far above the 44pt minimum
target — that is the whole point of the layout. **Do not add content that shrinks them.**

### Zone anatomy

Left column: team name (`label`, team colour, one line), partner names (`caption`,
`teamMuted(team)`), six game pips, `SETS n`. Right: the score numeral, `scoreNumeral`, `colors.text`.

The numeral stays white, not team-coloured — the coloured elements are the label, pips, and wash, so
the numeral reads as data rather than decoration.

### The ticker

Resting: the last 14 points as 4×14 bars in team colours, on `surface`.

Ignited: the whole bar cross-fades to the owning team's colour over 200ms, the label snaps in, and an
arrow + team name sits beside it at 50% black. When the situation favours neither team (golden point,
deuce, tight tiebreak) the bar stays `surface` and the text is `colors.text`.

Simultaneously, the *zone* of the team at stake runs the `flash` wash — its accent colour at 5–16%
opacity, pulsing at 1.1s. Both cues fire together; neither works alone at arm's length.

### Interaction

| Action | Result |
|---|---|
| Tap a zone | Award that team the point. Haptic scaled to what it won (see `05`) |
| Tap **Undo** | Remove the last point. Selection haptic. Hidden when no points played |
| Tap **Done** | End the match. Complete → recap. Incomplete → **abandoned**, no winner |
| **Hardware back** | Confirm sheet, never a silent discard — see the Android rules above |
| Match completes | Wait 1000ms so the win lands, then navigate to recap |

`useKeepAwake()` for the whole screen. Release on unmount.

**Rapid taps must not drop points.** Derive new state from the store's current state inside the
action, never from a value captured in a render closure. The starter store does this correctly; if
you refactor it, keep that property and add a test that fires ten taps synchronously.

### Abandoning

Ending an incomplete match is a first-class outcome, not an error. The recap must say **NO RESULT**,
show the unfinished set with an asterisk (`6-4 2-1*`), name who was ahead, and **not** crown an MVP.
The history row gets a `NO RESULT` badge in outline rather than a filled `WON` / `LOST`.

---

## 2. New match — `app/match/new.tsx`

Modal presentation. Nav: `Cancel` (lime, left) · `New match` (centre) · transparent spacer (right).

Content is three grouped list cards with `sectionCap` captions above each:

**TEAM A** — two rows, each a text input, 16pt, prefilled from the squad roster.
**TEAM B** — same.
**RULES** —
- `Sets` with a segmented control: `3` / `1`
- `Golden point` with a toggle, default **on**
- `Court` with a right-aligned text input, `textDim`

Bottom: **Start match**, full width, height 58, radius 29, lime.

Validation is deliberately thin: names may be blank (fall back to "Player 1"…), and the button is
never disabled. Nobody should be blocked from starting a match by a form.

Roster behaviour: tapping a name field offers the squad roster as suggestions above the keyboard. A
name not on the roster creates a new `squad_players` row on sync. This is the mechanism that makes
"claimable accounts later" work — never write a raw string into the match.

---

## 3. Recap — `app/match/[id].tsx`

Serves both the just-finished match and any past match opened from history.

Nav: `‹ Back` (lime text, left) · `Full time` (centre) · transparent spacer.

Centred block: `WINNERS` in `metaLabel` `textFaint`, the winning pair in `displayLg`, then the
scoreline in a lime pill (radius 16, padding 12×22, `recapScore` on `onAccent`).

Below: a grouped list — `Duration`, `Points played`, `Finish` (e.g. "4-point run to close").

Below that: the full point-by-point timeline, 6×18 bars, wrapping.

Bottom: **Rematch** — starts a new match with the same teams, format, and court.

For an abandoned match: headline `NO RESULT`, winner line reads "Match abandoned", the pill shows
`6-4 2-1*`, and the Finish row is replaced by who was ahead. No MVP row.

---

## 4. Home + session ladder — `app/(tabs)/index.tsx`

Greeting and date line at the top, squad avatar right.

Sport chips: `PADEL` filled lime; `BADMINTON` and `TENNIS` outlined `textFaint` with a superscript
`SOON`. They are not pressable in v1 — they are a promise, and they cost nothing to render.

**Start match** as the big primary action, styled as a lime card rather than a pill because it is the
screen's whole purpose.

**Session ladder**: rank, name, an `ON FIRE` badge in orange for anyone on a 3+ win streak, and a
W-L record. Sorted by wins, then win rate. Reads from the `player_records` view, cached by TanStack
Query, falling back to local matches when offline.

**Last match**: one row, tappable to the recap.

---

## 5. History — `app/(tabs)/history.tsx`

Three stat cards across the top: `RECORD` (W-L), `STREAK` (`W3` in lime, `L2` in orange), `COURT TIME`.

Below, matches grouped by month with `sectionCap` headers. Each row: result badge, opponents,
date + court, scoreline. Tapping expands in place to reveal set-by-set cards, the point timeline, and
duration + court — the expansion animates height, it does not navigate.

Unsynced matches show a small `textFaint` dot beside the date. Never block the list on the network.

---

## 6. Squad invites — `app/squad/index.tsx`, `app/squad/join/[code].tsx`

Squad screen lists members and the roster, with an invite code in a monospace-feeling row and a
**Share invite** button using the native share sheet.

Deep link `rackettrack://join/ABCD1234` and a matching universal link. `join/[code].tsx` calls
`join_squad(code)`, then routes home. If the user is signed out, hold the code, send them to sign-in,
and resume after.

---

## Accessibility

- Every tap zone gets `accessibilityRole="button"` and a label like "Award point to Cian and Aoife".
- After each point, announce the new score with `AccessibilityInfo.announceForAccessibility`.
- The design's contrast is strong throughout, but `textFaint` on `bg` sits near the AA floor for
  small text — do not use it below 11pt.
- Respect reduced motion: check `AccessibilityInfo.isReduceMotionEnabled()` and drop `pop` and
  `flash` to instant state changes. The ticker colour change alone still carries the meaning.
- Test with TalkBack once. The two-zone layout is unusually screen-reader friendly — two large
  labelled buttons — so this is cheap to get right.
- Android honours the system font scale. At 1.3× the nav bar and list rows must still fit; cap the
  score numeral with `allowFontScaling={false}` since it is already 130pt and purely graphic.
