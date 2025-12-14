import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface AlertRule {
  id: string;
  user_id: string;
  org_id?: string | null;
  device_id?: string | null;
  name: string;
  description?: string | null;
  source: string;
  pin?: number | null;
  sensor_key?: string | null;
  condition: string;
  expected_value?: string | null;
  message_template: string;
  severity: string;
  cooldown_seconds: number;
  enabled: boolean;
  last_fired_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  device?: {
    id: string;
    name: string;
    device_id: string;
  } | null;
}

export interface CreateAlertRuleInput {
  device_id?: string;
  name: string;
  description?: string;
  source: 'GPIO' | 'SENSOR' | 'ONLINE';
  pin?: number;
  sensor_key?: string;
  condition: string;
  expected_value?: string;
  message_template: string;
  severity: 'info' | 'warning' | 'critical';
  cooldown_seconds?: number;
  enabled?: boolean;
}

export function useAlertRules() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = async () => {
    if (!user) {
      setRules([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('alert_rules')
        .select(`
          *,
          device:devices(id, name, device_id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRules(data || []);
    } catch (err: any) {
      console.error('Error fetching alert rules:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [user]);

  const createRule = async (input: CreateAlertRuleInput) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error: createError } = await supabase
      .from('alert_rules')
      .insert({
        ...input,
        user_id: user.id,
        cooldown_seconds: input.cooldown_seconds ?? 30,
        enabled: input.enabled ?? true
      })
      .select()
      .single();

    if (createError) throw createError;

    await fetchRules();
    toast.success('Alert rule created');
    return data;
  };

  const updateRule = async (id: string, updates: Partial<CreateAlertRuleInput>) => {
    const { error: updateError } = await supabase
      .from('alert_rules')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    await fetchRules();
    toast.success('Alert rule updated');
  };

  const deleteRule = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('alert_rules')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await fetchRules();
    toast.success('Alert rule deleted');
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    await updateRule(id, { enabled });
  };

  return {
    rules,
    loading,
    error,
    refetch: fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule
  };
}
