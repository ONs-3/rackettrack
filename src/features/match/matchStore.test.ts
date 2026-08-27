import { useMatchStore } from './matchStore';

const teamA = [{ id: 'a1', displayName: 'Cian' }, { id: 'a2', displayName: 'Aoife' }];
const teamB = [{ id: 'b1', displayName: 'Rob' }, { id: 'b2', displayName: 'Sinéad' }];

beforeEach(() => {
  useMatchStore.setState({ live: null, state: useMatchStore.getState().state });
  useMatchStore.getState().discard();
});

describe('matchStore', () => {
  it('starts a match with an empty timeline', () => {
    useMatchStore.getState().startMatch({ squadId: null, court: 'Court 1', teamA, teamB });
    const { live, state } = useMatchStore.getState();
    expect(live?.teams).toEqual([teamA, teamB]);
    expect(state.timeline).toEqual([]);
  });

  it('happy path: awarding points advances the derived state', () => {
    useMatchStore.getState().startMatch({ squadId: null, court: 'Court 1', teamA, teamB });
    useMatchStore.getState().awardPoint(0);
    useMatchStore.getState().awardPoint(0);
    expect(useMatchStore.getState().state.points).toEqual([2, 0]);
  });

  it('undo removes exactly the last point', () => {
    useMatchStore.getState().startMatch({ squadId: null, court: 'Court 1', teamA, teamB });
    useMatchStore.getState().awardPoint(0);
    useMatchStore.getState().awardPoint(1);
    useMatchStore.getState().undo();
    expect(useMatchStore.getState().state.timeline).toEqual([0]);
  });

  it('undo on a fresh match is a no-op, not a throw', () => {
    useMatchStore.getState().startMatch({ squadId: null, court: 'Court 1', teamA, teamB });
    expect(() => useMatchStore.getState().undo()).not.toThrow();
    expect(useMatchStore.getState().state.timeline).toEqual([]);
  });

  it('rapid synchronous taps do not drop points', () => {
    useMatchStore.getState().startMatch({ squadId: null, court: 'Court 1', teamA, teamB });
    for (let i = 0; i < 10; i++) useMatchStore.getState().awardPoint(0);
    // Ten points to one team: two games won (4 pts each) plus 2 leftover.
    expect(useMatchStore.getState().state.timeline).toHaveLength(10);
    expect(useMatchStore.getState().state.games[0]).toBe(2);
  });

  it('ending early (before completion) reports abandoned', () => {
    useMatchStore.getState().startMatch({ squadId: null, court: 'Court 1', teamA, teamB });
    useMatchStore.getState().awardPoint(0);
    const result = useMatchStore.getState().end();
    expect(result?.status).toBe('abandoned');
  });

  it('ending a completed match reports complete with the final scoreline', () => {
    useMatchStore.getState().startMatch({
      squadId: null,
      format: { bestOf: 1 },
      court: 'Court 1',
      teamA,
      teamB,
    });
    for (let i = 0; i < 24; i++) useMatchStore.getState().awardPoint(0);
    const result = useMatchStore.getState().end();
    expect(result?.status).toBe('complete');
    expect(result?.scoreline).toBe('6-0');
  });

  it('discard clears the live match entirely', () => {
    useMatchStore.getState().startMatch({ squadId: null, court: 'Court 1', teamA, teamB });
    useMatchStore.getState().discard();
    expect(useMatchStore.getState().live).toBeNull();
    expect(useMatchStore.getState().state.timeline).toEqual([]);
  });
});
