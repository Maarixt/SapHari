-- Create alert_rules table
CREATE TABLE IF NOT EXISTS public.alert_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_count INTEGER DEFAULT 0,
    last_triggered TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alert_rules_user_id ON public.alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON public.alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_created_at ON public.alert_rules(created_at);

-- Enable RLS
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own alert rules" ON public.alert_rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert rules" ON public.alert_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert rules" ON public.alert_rules
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert rules" ON public.alert_rules
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_alert_rules_updated_at 
    BEFORE UPDATE ON public.alert_rules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
