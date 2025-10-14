-- Master Dashboard Data Layer Migration
-- Works with existing schema (profiles, devices, alerts, audit_logs, widgets)

-- 1) KPI view for fast queries
create or replace view public.v_master_kpis as
select
  (select count(*) from public.profiles)::bigint as total_users,
  (select count(*) from public.devices)::bigint as total_devices,
  (select count(*) from public.devices where online = true)::bigint as online_devices,
  (select count(*) from public.devices where online = false)::bigint as offline_devices,
  (select count(*) from public.alerts where created_at > now() - interval '24 hours')::bigint as alerts_24h,
  0::bigint as telemetry_bytes;

-- 2) Devices overview view with widget counts
create or replace view public.v_devices_overview as
select
  d.id,
  d.device_id,
  d.name,
  d.device_key,
  d.user_id as owner_id,
  p.display_name as owner_name,
  p.email as owner_email,
  d.online,
  d.created_at,
  d.updated_at,
  coalesce(w.widget_count, 0) as widget_count,
  coalesce(a.alert_count, 0) as alert_count
from public.devices d
left join public.profiles p on p.id = d.user_id
left join (
  select device_id, count(*) as widget_count
  from public.widgets
  group by device_id
) w on w.device_id = d.id
left join (
  select device_id, count(*) as alert_count
  from public.alerts
  where read = false
  group by device_id
) a on a.device_id = d.id;

-- 3) Recent audit logs view
create or replace view public.v_audit_recent as
select
  id,
  action,
  actor_email,
  actor_role,
  resource,
  details,
  ip_address,
  user_agent,
  timestamp,
  created_at
from public.audit_logs
order by timestamp desc
limit 500;

-- 4) Recent alerts view
create or replace view public.v_alerts_recent as
select
  a.id,
  a.device_id,
  a.user_id,
  a.message,
  a.type,
  a.read,
  a.created_at,
  d.name as device_name,
  p.display_name as user_name
from public.alerts a
left join public.devices d on d.id = a.device_id
left join public.profiles p on p.id = a.user_id
order by a.created_at desc
limit 500;

-- 5) Users overview view with roles
create or replace view public.v_users_overview as
select
  p.id,
  p.email,
  p.display_name,
  p.created_at,
  p.updated_at,
  ur.role,
  (select count(*) from public.devices where user_id = p.id) as device_count,
  (select count(*) from public.alerts where user_id = p.id and read = false) as unread_alerts
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id;

-- 6) Add master read policies for views (they inherit from base tables)
-- Ensure RLS is enabled on base tables
alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_logs enable row level security;
alter table public.widgets enable row level security;

-- Add master read-all policies (if not already exist)
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'master_read_all_profiles') then
    create policy master_read_all_profiles on public.profiles
      for select using (is_master_user(auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'devices' and policyname = 'master_read_all_devices') then
    create policy master_read_all_devices on public.devices
      for select using (is_master_user(auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alerts' and policyname = 'master_read_all_alerts') then
    create policy master_read_all_alerts on public.alerts
      for select using (is_master_user(auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'widgets' and policyname = 'master_read_all_widgets') then
    create policy master_read_all_widgets on public.widgets
      for select using (is_master_user(auth.uid()));
  end if;
end $$;