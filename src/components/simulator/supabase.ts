import { supabase } from '@/integrations/supabase/client';
import { SimState } from './types';

export interface CircuitData {
  id: string;
  user_id: string;
  name: string;
  json: SimState;
  created_at: string;
  updated_at?: string;
}

export const LAST_CIRCUIT_LOCAL_KEY = 'saphari:lastCircuit';

export async function saveCircuit(name: string, state: SimState, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('sim_circuits')
    .insert({
      user_id: userId,
      name,
      json: state,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save circuit: ${error.message}`);
  }

  return data.id;
}

/** Load all circuits for the current user (RLS restricts to auth.uid()). */
export async function loadCircuits(): Promise<CircuitData[]> {
  const { data, error } = await supabase
    .from('sim_circuits')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load circuits: ${error.message}`);
  }

  return data ?? [];
}

export async function loadCircuit(id: string): Promise<CircuitData | null> {
  const { data, error } = await supabase
    .from('sim_circuits')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to load circuit: ${error.message}`);
  }

  return data;
}

export async function deleteCircuit(id: string): Promise<void> {
  const { error } = await supabase.from('sim_circuits').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete circuit: ${error.message}`);
  }
}

/** Read last circuit from localStorage (fallback when Supabase fails or offline). */
export function getLastCircuitFromStorage(): { name: string; json: SimState; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(LAST_CIRCUIT_LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: string; json?: SimState; savedAt?: number };
    if (!parsed?.json || !Array.isArray(parsed.json.components) || !Array.isArray(parsed.json.wires))
      return null;
    return {
      name: parsed.name ?? 'Last circuit',
      json: parsed.json as SimState,
      savedAt: parsed.savedAt ?? 0,
    };
  } catch {
    return null;
  }
}

/** Write circuit to localStorage as last circuit. */
export function setLastCircuitInStorage(name: string, json: SimState): void {
  try {
    localStorage.setItem(
      LAST_CIRCUIT_LOCAL_KEY,
      JSON.stringify({ name, json, savedAt: Date.now() })
    );
  } catch {
    // ignore
  }
}
