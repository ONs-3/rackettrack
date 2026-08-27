import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type Squad = Database['public']['Tables']['squads']['Row'];
export type SquadPlayer = Database['public']['Tables']['squad_players']['Row'];

function requireClient() {
  if (!supabase) throw new Error('No Supabase project configured.');
  return supabase;
}

export async function createSquad(name: string): Promise<Squad> {
  const client = requireClient();
  const { data, error } = await client.rpc('create_squad', { squad_name: name.trim() });
  if (error) throw error;
  return data;
}

export async function joinSquadByCode(code: string): Promise<Squad> {
  const client = requireClient();
  const { data, error } = await client.rpc('join_squad', { code: code.trim() });
  if (error) throw error;
  return data;
}

/** The signed-in user's first squad, or null if they have none yet. */
export async function fetchMySquad(): Promise<Squad | null> {
  const client = requireClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await client
    .from('squad_members')
    .select('squads(*)')
    .eq('profile_id', userData.user.id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.squads as unknown as Squad) ?? null;
}

export async function fetchRoster(squadId: string): Promise<SquadPlayer[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('squad_players')
    .select('*')
    .eq('squad_id', squadId)
    .order('display_name');
  if (error) throw error;
  return data ?? [];
}
