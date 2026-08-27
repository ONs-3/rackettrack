/**
 * Hand-written from `supabase/migrations/0001_init.sql`, matching the shape
 * `supabase gen types typescript` produces. Regenerate for perfect fidelity
 * once you have CLI access:
 *
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      squads: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      squad_members: {
        Row: {
          squad_id: string;
          profile_id: string;
          role: 'owner' | 'member';
          joined_at: string;
        };
        Insert: {
          squad_id: string;
          profile_id: string;
          role?: 'owner' | 'member';
          joined_at?: string;
        };
        Update: {
          squad_id?: string;
          profile_id?: string;
          role?: 'owner' | 'member';
          joined_at?: string;
        };
        Relationships: [];
      };
      squad_players: {
        Row: {
          id: string;
          squad_id: string;
          display_name: string;
          claimed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          squad_id: string;
          display_name: string;
          claimed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          squad_id?: string;
          display_name?: string;
          claimed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          client_id: string;
          squad_id: string;
          created_by: string;
          sport: string;
          format: Json;
          court: string | null;
          started_at: string;
          ended_at: string | null;
          status: 'live' | 'complete' | 'abandoned';
          winner_team: number | null;
          synced_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          squad_id: string;
          created_by: string;
          sport?: string;
          format: Json;
          court?: string | null;
          started_at: string;
          ended_at?: string | null;
          status?: 'live' | 'complete' | 'abandoned';
          winner_team?: number | null;
          synced_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          squad_id?: string;
          created_by?: string;
          sport?: string;
          format?: Json;
          court?: string | null;
          started_at?: string;
          ended_at?: string | null;
          status?: 'live' | 'complete' | 'abandoned';
          winner_team?: number | null;
          synced_at?: string;
        };
        Relationships: [];
      };
      match_teams: {
        Row: {
          match_id: string;
          team_index: number;
          label: string | null;
        };
        Insert: {
          match_id: string;
          team_index: number;
          label?: string | null;
        };
        Update: {
          match_id?: string;
          team_index?: number;
          label?: string | null;
        };
        Relationships: [];
      };
      match_team_players: {
        Row: {
          match_id: string;
          team_index: number;
          player_id: string;
          position: number;
        };
        Insert: {
          match_id: string;
          team_index: number;
          player_id: string;
          position?: number;
        };
        Update: {
          match_id?: string;
          team_index?: number;
          player_id?: string;
          position?: number;
        };
        Relationships: [];
      };
      match_sets: {
        Row: {
          match_id: string;
          set_index: number;
          games_a: number;
          games_b: number;
          tiebreak: boolean;
        };
        Insert: {
          match_id: string;
          set_index: number;
          games_a: number;
          games_b: number;
          tiebreak?: boolean;
        };
        Update: {
          match_id?: string;
          set_index?: number;
          games_a?: number;
          games_b?: number;
          tiebreak?: boolean;
        };
        Relationships: [];
      };
      match_points: {
        Row: {
          match_id: string;
          seq: number;
          winning_team: number;
        };
        Insert: {
          match_id: string;
          seq: number;
          winning_team: number;
        };
        Update: {
          match_id?: string;
          seq?: number;
          winning_team?: number;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          profile_id: string;
          token: string;
          platform: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          token: string;
          platform?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          token?: string;
          platform?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      player_records: {
        Row: {
          player_id: string | null;
          squad_id: string | null;
          display_name: string | null;
          wins: number | null;
          losses: number | null;
          last_played_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_squad: {
        Args: { squad_name: string };
        Returns: Database['public']['Tables']['squads']['Row'];
      };
      join_squad: {
        Args: { code: string };
        Returns: Database['public']['Tables']['squads']['Row'];
      };
      sync_match: {
        Args: { payload: Json };
        Returns: string;
      };
      is_squad_member: {
        Args: { target_squad: string };
        Returns: boolean;
      };
      can_read_match: {
        Args: { target: string };
        Returns: boolean;
      };
      can_write_match: {
        Args: { target: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
