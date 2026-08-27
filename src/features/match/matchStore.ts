import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import {
  awardPoint as enginePoint,
  emptyState,
  replay,
  scoreline,
  situation,
  undoPoint as engineUndo,
} from '@/features/scoring/engine';
import {
  PADEL_DEFAULT_FORMAT,
  type MatchFormat,
  type MatchState,
  type TeamIndex,
} from '@/features/scoring/types';
import { zustandStorage } from '@/lib/storage';

export interface RosterPlayer {
  id: string;          // squad_players.id, or a local uuid until the roster syncs
  displayName: string;
}

export interface LiveMatch {
  clientId: string;
  squadId: string | null;
  format: MatchFormat;
  court: string;
  teams: [RosterPlayer[], RosterPlayer[]];
  startedAt: number;
  endedAt: number | null;
  /** The durable record. Everything else is derived from this by replay(). */
  timeline: TeamIndex[];
}

interface MatchStore {
  live: LiveMatch | null;
  /** Derived; recomputed on every mutation. Never write to this directly. */
  state: MatchState;

  startMatch(input: {
    squadId: string | null;
    format?: Partial<MatchFormat>;
    court: string;
    teamA: RosterPlayer[];
    teamB: RosterPlayer[];
  }): void;
  awardPoint(team: TeamIndex): void;
  undo(): void;
  /** End the match. `abandoned` when the user stopped early with no winner. */
  end(): { status: 'complete' | 'abandoned'; scoreline: string } | null;
  discard(): void;
}

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      live: null,
      state: emptyState(),

      startMatch({ squadId, format, court, teamA, teamB }) {
        const live: LiveMatch = {
          clientId: Crypto.randomUUID(),
          squadId,
          format: { ...PADEL_DEFAULT_FORMAT, ...format },
          court,
          teams: [teamA, teamB],
          startedAt: Date.now(),
          endedAt: null,
          timeline: [],
        };
        set({ live, state: emptyState() });
      },

      awardPoint(team) {
        const { live, state } = get();
        if (!live || state.status === 'complete') return;
        const next = enginePoint(live.format, state, team);
        set({
          state: next,
          live: { ...live, timeline: next.timeline, endedAt: next.status === 'complete' ? Date.now() : null },
        });
      },

      undo() {
        const { live, state } = get();
        if (!live || state.timeline.length === 0) return;
        const next = engineUndo(live.format, state);
        set({ state: next, live: { ...live, timeline: next.timeline, endedAt: null } });
      },

      end() {
        const { live, state } = get();
        if (!live) return null;
        const status = state.status === 'complete' ? 'complete' : 'abandoned';
        set({ live: { ...live, endedAt: live.endedAt ?? Date.now() } });
        return { status, scoreline: scoreline(state) };
      },

      discard() {
        set({ live: null, state: emptyState() });
      },
    }),
    {
      name: 'rackettrack.live-match',
      storage: createJSONStorage(() => zustandStorage),
      // Only the durable record is persisted; derived state is rebuilt on hydrate.
      partialize: (s) => ({ live: s.live }),
      onRehydrateStorage: () => (store) => {
        if (store?.live) {
          useMatchStore.setState({ state: replay(store.live.format, store.live.timeline) });
        }
      },
    },
  ),
);

// --- Selectors -------------------------------------------------------------
// Components subscribe to these, not to the whole store, so a point tap does not
// re-render the nav bar.

export const selectSituation = (s: MatchStore) =>
  s.live ? situation(s.live.format, s.state) : null;

export const selectTeamNames = (s: MatchStore): [string, string] => {
  if (!s.live) return ['TEAM A', 'TEAM B'];
  return s.live.teams.map((t) => t.map((p) => p.displayName).join(' & ').toUpperCase()) as [string, string];
};

export const selectPartners = (s: MatchStore, team: TeamIndex) =>
  s.live?.teams[team].map((p) => p.displayName).join(' · ') ?? '';

/** Animation key: changes on every point so "40" following "40" still pops. */
export const selectPopKey = (s: MatchStore) => s.state.timeline.length;
