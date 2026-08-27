import { useEffect } from 'react';
import { joinSquadByCode } from './squadApi';
import { setCachedSquad } from './currentSquad';
import { clearPendingJoinCode, getPendingJoinCode } from './pendingJoin';
import { claimGuestMatches, drainOutbox, unclaimedCount } from '@/lib/outbox';
import { useSession } from '@/features/auth/useSession';

/**
 * If the user opened an invite link while signed out, join/[code].tsx holds
 * the code and sends them to sign in. Once a session appears — Google is
 * synchronous, but an email magic link completes later via a fresh deep
 * link — finish the join here rather than threading it through navigation.
 */
export function useResumePendingJoin(): void {
  const { session } = useSession();

  useEffect(() => {
    if (!session) return;
    const code = getPendingJoinCode();
    if (!code) return;

    clearPendingJoinCode();
    joinSquadByCode(code)
      .then((squad) => {
        setCachedSquad(squad);
        if (unclaimedCount() > 0) {
          claimGuestMatches(squad.id);
          drainOutbox();
        }
      })
      .catch(() => {
        // Best-effort — the user can retry the invite code from the squad screen.
      });
  }, [session]);
}
