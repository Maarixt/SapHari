import { supabase } from '@/integrations/supabase/client';
import { SimState } from './types';

export interface CircuitData {
  id: string;
  user_id: string;
  name: string;
  json: SimState;
  created_at: string;
}

// TODO: Implement these functions after creating sim_circuits table in Supabase
export async function saveCircuit(name: string, state: SimState, userId: string): Promise<string> {
  throw new Error('sim_circuits table not yet created - please create the table first');
  /*
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
  */
}

export async function loadCircuits(): Promise<CircuitData[]> {
  throw new Error('sim_circuits table not yet created - please create the table first');
  /*
  const { data, error } = await supabase
    .from('sim_circuits')
    .select('*')
    .order('created_at', { ascending: false});

  if (error) {
    throw new Error(`Failed to load circuits: ${error.message}`);
  }

  return data || [];
  */
}

export async function loadCircuit(id: string): Promise<CircuitData | null> {
  throw new Error('sim_circuits table not yet created - please create the table first');
  /*
  const { data, error} = await supabase
    .from('sim_circuits')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to load circuit: ${error.message}`);
  }

  return data;
  */
}

export async function deleteCircuit(id: string): Promise<void> {
  throw new Error('sim_circuits table not yet created - please create the table first');
  /*
  const { error } = await supabase
    .from('sim_circuits')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete circuit: ${error.message}`);
  }
  */
}
