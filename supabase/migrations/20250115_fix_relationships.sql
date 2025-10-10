-- Fix devices ↔ profiles relationship and add proper foreign keys
-- This migration ensures proper database relationships for the master dashboard

-- 1) Make sure profiles exists and has a UUID PK named id
create table if not exists public.profiles (
  id uuid primary key,
  email text unique,
  display_name text,
  created_at timestamptz default now()
);

-- 2) Ensure devices table exists and owner_id is UUID
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  owner_id uuid not null,
  name text not null,
  firmware_version text,
  created_at timestamptz default now()
);

-- If owner_id is not uuid, fix it:
-- alter table public.devices alter column owner_id type uuid using owner_id::uuid;

-- 3) Remove any wrong/old FK first (ignore errors if none)
do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'devices' and c.conname = 'devices_owner_id_fkey'
  ) then
    alter table public.devices drop constraint devices_owner_id_fkey;
  end if;
end $$;

-- 4) Create the correct FK to profiles(id)
alter table public.devices
  add constraint devices_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete cascade;

-- 5) Helpful index
create index if not exists idx_devices_owner_id on public.devices(owner_id);

-- 6) Add FK for device_status if it exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'device_status') then
    -- Remove old FK if exists
    if exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'device_status' and c.conname = 'device_status_device_fk'
    ) then
      alter table public.device_status drop constraint device_status_device_fk;
    end if;
    
    -- Add new FK
    alter table public.device_status
      add constraint device_status_device_fk
      foreign key (device_id) references public.devices(device_id) on delete cascade;
  end if;
end $$;

-- 7) Enable RLS on devices table
alter table public.devices enable row level security;

-- 8) Create RLS policies for devices
-- Owner can see their devices
create policy if not exists user_read_own_devices on public.devices
for select using (owner_id = auth.uid());

-- Master can see all devices
create or replace function public.is_master(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role = 'master'
  );
$$;

create policy if not exists master_read_all_devices on public.devices
for select using (public.is_master(auth.uid()));

-- 9) Enable RLS on profiles table
alter table public.profiles enable row level security;

-- Profiles policies
create policy if not exists user_read_own_profile on public.profiles
for select using (id = auth.uid());

create policy if not exists master_read_all_profiles on public.profiles
for select using (public.is_master(auth.uid()));

-- 10) Enable RLS on device_status if it exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'device_status') then
    alter table public.device_status enable row level security;
    
    create policy if not exists user_read_own_device_status on public.device_status
    for select using (
      exists (
        select 1 from public.devices 
        where devices.device_id = device_status.device_id 
        and devices.owner_id = auth.uid()
      )
    );
    
    create policy if not exists master_read_all_device_status on public.device_status
    for select using (public.is_master(auth.uid()));
  end if;
end $$;

-- 11) Enable RLS on alerts if it exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'alerts') then
    alter table public.alerts enable row level security;
    
    create policy if not exists user_read_own_alerts on public.alerts
    for select using (
      exists (
        select 1 from public.devices 
        where devices.device_id = alerts.device_id 
        and devices.owner_id = auth.uid()
      )
    );
    
    create policy if not exists master_read_all_alerts on public.alerts
    for select using (public.is_master(auth.uid()));
  end if;
end $$;

-- 12) Enable RLS on device_events if it exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'device_events') then
    alter table public.device_events enable row level security;
    
    create policy if not exists user_read_own_device_events on public.device_events
    for select using (
      exists (
        select 1 from public.devices 
        where devices.device_id = device_events.device_id 
        and devices.owner_id = auth.uid()
      )
    );
    
    create policy if not exists master_read_all_device_events on public.device_events
    for select using (public.is_master(auth.uid()));
  end if;
end $$;

-- 13) Enable RLS on mqtt_messages if it exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'mqtt_messages') then
    alter table public.mqtt_messages enable row level security;
    
    create policy if not exists user_read_own_mqtt_messages on public.mqtt_messages
    for select using (
      device_id is null or exists (
        select 1 from public.devices 
        where devices.device_id = mqtt_messages.device_id 
        and devices.owner_id = auth.uid()
      )
    );
    
    create policy if not exists master_read_all_mqtt_messages on public.mqtt_messages
    for select using (public.is_master(auth.uid()));
  end if;
end $$;

-- 14) Enable RLS on audit_logs if it exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'audit_logs') then
    alter table public.audit_logs enable row level security;
    
    create policy if not exists user_read_own_audit_logs on public.audit_logs
    for select using (actor_id = auth.uid());
    
    create policy if not exists master_read_all_audit_logs on public.audit_logs
    for select using (public.is_master(auth.uid()));
  end if;
end $$;

-- 15) Make PostgREST (Supabase API) reload its schema cache
notify pgrst, 'reload schema';
