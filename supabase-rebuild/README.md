# SapHari Database Rebuild

Complete database schema rebuild for SapHari IoT platform.

## 🎯 Overview

This folder contains SQL scripts to rebuild the entire SapHari database from scratch after a data wipe. The scripts are designed to be:

- **Idempotent**: Can be run multiple times safely
- **Order-dependent**: Must be executed in numerical order
- **Comprehensive**: Includes tables, functions, triggers, RLS, and views
- **Production-ready**: Includes all security policies and optimizations

## 📋 Migration Scripts

| Script | Description |
|--------|-------------|
| `01_init_schema.sql` | Core schema, enums, tables, and indexes |
| `02_functions_and_triggers.sql` | Helper functions, RPCs, and triggers |
| `03_rls_policies.sql` | Row Level Security policies for all tables |
| `04_master_dashboard_views.sql` | Aggregated views for master dashboard |
| `05_seed_data.sql` | Optional seed data and helper queries |

## 🚀 Quick Start

### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project → SQL Editor
3. Copy and paste each script in order (01 → 05)
4. Run each script
5. Verify in Table Editor that all tables exist

### Option 2: Supabase CLI

```bash
# Ensure you're in the project root
cd /path/to/saphari

# Run each migration in order
supabase db execute --file supabase-rebuild/01_init_schema.sql
supabase db execute --file supabase-rebuild/02_functions_and_triggers.sql
supabase db execute --file supabase-rebuild/03_rls_policies.sql
supabase db execute --file supabase-rebuild/04_master_dashboard_views.sql
supabase db execute --file supabase-rebuild/05_seed_data.sql  # Optional
```

### Option 3: PostgreSQL Direct Connection

```bash
# Using psql
psql -h db.wrdeomgtkbehvbfhiprm.supabase.co \
     -U postgres \
     -d postgres \
     -f supabase-rebuild/01_init_schema.sql

# Repeat for each script
```

## 📊 Database Schema Summary

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `profiles` | User profiles | Extends auth.users |
| `user_roles` | User roles (SEPARATE for security) | 5 role levels |
| `devices` | IoT devices | ESP32, online status |
| `widgets` | Device controls | Switches, sensors, gauges |
| `alerts` | User notifications | From devices/rules |
| `telemetry` | Time-series data | Sensor readings |
| `commands` | Device commands | With ACK tracking |
| `broker_settings` | MQTT config | Per-user |
| `audit_logs` | Audit trail | Master actions |
| `notifications` | In-app notices | User notifications |
| `sim_circuits` | Saved circuits | Simulator designs |
| `automation_rules` | User rules | Automation logic |

### Role Hierarchy

```
Master (Level 0)
  └─ Admin (Level 1)
      └─ Developer (Level 2)
          └─ Technician (Level 3)
              └─ User (Level 4)
```

### Key Functions

- `is_master(uid)` - Check if user is master
- `has_role(uid, role)` - Check if user has specific role
- `get_user_role(uid)` - Get user's highest role
- `get_master_kpis()` - Fetch master dashboard KPIs
- `user_owns_device(device_id)` - Verify device ownership
- `log_audit_event()` - Create audit log entry

### Master Dashboard Views

- `v_master_kpis` - Key performance indicators
- `v_devices_overview` - All devices with stats
- `v_users_overview` - All users with roles
- `v_alerts_recent` - Recent 100 alerts
- `v_audit_recent` - Recent 100 audit logs
- `v_device_health` - Device health status

## 🔒 Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- **User isolation**: Users see only their own data
- **Master override**: Masters see all data
- **Admin scoping**: Admins see tenant-specific data (future)

### Role-Based Access Control (RBAC)

- Roles stored in separate `user_roles` table (NOT in profiles)
- Helper functions use `SECURITY DEFINER` to prevent recursion
- Master views use `security_invoker = false` for elevated access

## 🎬 Post-Migration Steps

### 1. Create a User Account

```sql
-- Sign up through the app UI or Supabase Auth
-- Then find your user ID
SELECT id, email FROM auth.users;
```

### 2. Grant Master Role

```sql
-- Replace with your actual user ID
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-user-id-here', 'master')
ON CONFLICT (user_id, role) DO NOTHING;
```

### 3. Verify Installation

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';

-- Check views exist
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public';
```

### 4. Test Master Access

```sql
-- Should return true for master users
SELECT public.is_master(auth.uid());

-- Should return master KPIs
SELECT * FROM public.v_master_kpis;

-- Should show all devices
SELECT * FROM public.v_devices_overview;
```

## 🐛 Troubleshooting

### Issue: "relation already exists"

**Solution**: Scripts use `IF NOT EXISTS` - safe to re-run

### Issue: "permission denied for schema public"

**Solution**: Ensure you're connected as `postgres` user or have sufficient privileges

### Issue: "function auth.uid() does not exist"

**Solution**: You're not in an authenticated context. Use Supabase client or set JWT claims:

```sql
SET LOCAL "request.jwt.claims" TO '{"sub": "your-user-id"}';
```

### Issue: RLS blocks all queries

**Solution**: Ensure you have a valid session or are running as master:

```sql
-- Check current user
SELECT auth.uid();

-- Check if master
SELECT public.is_master(auth.uid());

-- Grant master role if needed
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'master');
```

### Issue: Views return empty results

**Solution**: Views have master-only access. Check your role:

```sql
-- Check your role
SELECT role FROM public.user_roles WHERE user_id = auth.uid();

-- If not master, grant it
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'master')
ON CONFLICT DO NOTHING;
```

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)

## 🔄 Rollback

To completely reset the database:

```sql
-- ⚠️ WARNING: This deletes ALL data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run all migration scripts
```

## 📝 Notes

- **Device keys**: Auto-generated as 32-character hex strings
- **Timestamps**: All use `TIMESTAMPTZ` for timezone awareness
- **Indexes**: Optimized for common query patterns
- **Triggers**: Auto-update `updated_at` on all mutable tables
- **Foreign keys**: Cascade deletes to prevent orphaned records
- **JSONB**: Used for flexible metadata and configuration

## ✅ Validation Checklist

After running migrations:

- [ ] All 12 tables created
- [ ] All indexes created
- [ ] RLS enabled on all tables
- [ ] All helper functions exist
- [ ] All triggers created
- [ ] All views accessible to master
- [ ] Master user assigned
- [ ] Test queries return expected results
- [ ] Application connects successfully
- [ ] No RLS policy violations in logs

## 🆘 Support

If you encounter issues:

1. Check Supabase logs in Dashboard → Logs
2. Review PostgreSQL error messages
3. Verify user authentication and roles
4. Check RLS policies are not blocking access
5. Ensure all scripts ran successfully in order

## 📄 License

Copyright © 2025 SapHari. All rights reserved.
