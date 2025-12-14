-- Create alert_rules table for server-side alert processing
CREATE TABLE public.alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Trigger configuration
  source TEXT NOT NULL DEFAULT 'GPIO' CHECK (source IN ('GPIO', 'SENSOR', 'ONLINE')),
  pin INTEGER,
  sensor_key TEXT,
  condition TEXT NOT NULL DEFAULT 'equals' CHECK (condition IN ('equals', 'not_equals', 'greater_than', 'less_than', 'rising', 'falling', 'changes')),
  expected_value TEXT,
  -- Alert message
  message_template TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  -- Behavior
  cooldown_seconds INTEGER NOT NULL DEFAULT 30,
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_alert_rules_user_id ON public.alert_rules(user_id);
CREATE INDEX idx_alert_rules_device_id ON public.alert_rules(device_id);
CREATE INDEX idx_alert_rules_enabled ON public.alert_rules(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert_rules
CREATE POLICY "alert_rules_select_own"
  ON public.alert_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "alert_rules_insert_own"
  ON public.alert_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alert_rules_update_own"
  ON public.alert_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "alert_rules_delete_own"
  ON public.alert_rules FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "alert_rules_select_master"
  ON public.alert_rules FOR SELECT
  USING (is_master(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add rule_id column to alerts table to link generated alerts to rules
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL;

-- Add last_fired_at column to alert_rules for cooldown tracking
ALTER TABLE public.alert_rules ADD COLUMN IF NOT EXISTS last_fired_at TIMESTAMPTZ;