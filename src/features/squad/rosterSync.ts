import { supabase } from '@/lib/supabase';

/**
 * Resolve player display names to `squad_players.id`, creating rows for
 * names the squad hasn't seen before. This is what "a name not on the
 * roster creates a new squad_players row on sync" (04-screens.md) means in
 * practice — match_team_players has a hard FK to squad_players, so these
 * rows must exist before sync_match runs, not just be implied by a string.
 *
 * The one race worth handling (06-offline-sync-and-push.md): two devices
 * both add "Dave" offline. The second insert hits squad_players' unique
 * (squad_id, display_name) constraint (23505) — re-read and use the row
 * that won instead of failing the whole sync.
 */
export async function resolveRosterIds(squadId: string, names: string[]): Promise<Record<string, string>> {
  if (!supabase) throw new Error('No Supabase project configured.');
  const client = supabase;
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const result: Record<string, string> = {};
  if (unique.length === 0) return result;

  const { data: existing, error: selectError } = await client
    .from('squad_players')
    .select('id, display_name')
    .eq('squad_id', squadId)
    .in('display_name', unique);
  if (selectError) throw selectError;
  for (const row of existing ?? []) result[row.display_name] = row.id;

  const missing = unique.filter((n) => !(n in result));
  for (const name of missing) {
    const { data, error } = await client
      .from('squad_players')
      .insert({ squad_id: squadId, display_name: name })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: row, error: reReadError } = await client
          .from('squad_players')
          .select('id')
          .eq('squad_id', squadId)
          .eq('display_name', name)
          .single();
        if (reReadError) throw reReadError;
        result[name] = row.id;
        continue;
      }
      throw error;
    }
    result[name] = data.id;
  }

  return result;
}
