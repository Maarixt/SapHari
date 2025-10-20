# 🚀 Execute These SQL Scripts to Rebuild SapHari Database

## ⚡ QUICK START (Copy-Paste Method)

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard/project/wrdeomgtkbehvbfhiprm/sql/new
2. You should see the SQL Editor

### Step 2: Run Scripts in Order

**Copy each script below and run them one at a time in the SQL Editor:**

---

#### ✅ Script 1: Core Schema

```sql
-- 01_init_schema.sql
-- (Open supabase-rebuild/01_init_schema.sql and copy entire contents here)
```

---

#### ✅ Script 2: Functions & Triggers

```sql
-- 02_functions_and_triggers.sql
-- (Open supabase-rebuild/02_functions_and_triggers.sql and copy entire contents here)
```

---

#### ✅ Script 3: RLS Policies

```sql
-- 03_rls_policies.sql
-- (Open supabase-rebuild/03_rls_policies.sql and copy entire contents here)
```

---

#### ✅ Script 4: Master Dashboard Views

```sql
-- 04_master_dashboard_views.sql  
-- (Open supabase-rebuild/04_master_dashboard_views.sql and copy entire contents here)
```

---

#### ✅ Script 5: Seed Data (Optional)

```sql
-- 05_seed_data.sql
-- (Open supabase-rebuild/05_seed_data.sql and copy entire contents here)
```

---

### Step 3: Assign Master Role

After creating your user account through the app:

1. Find your user ID:

```sql
SELECT id, email FROM auth.users;
```

2. Grant yourself master role (replace `your-user-id-here`):

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-user-id-here', 'master')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Step 4: Verify

```sql
-- Check your role
SELECT 
  p.email,
  ur.role
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.id = auth.uid();

-- Test master access
SELECT * FROM public.v_master_kpis;
```

---

## 🔧 Alternative: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Navigate to project root
cd /path/to/saphari

# Run migrations
supabase db execute --file supabase-rebuild/01_init_schema.sql
supabase db execute --file supabase-rebuild/02_functions_and_triggers.sql
supabase db execute --file supabase-rebuild/03_rls_policies.sql
supabase db execute --file supabase-rebuild/04_master_dashboard_views.sql
```

---

## 📋 What Gets Created

### Tables (12)
- ✅ profiles
- ✅ user_roles (CRITICAL: separate from profiles)
- ✅ devices
- ✅ widgets
- ✅ alerts
- ✅ telemetry
- ✅ commands
- ✅ broker_settings
- ✅ audit_logs
- ✅ notifications
- ✅ sim_circuits
- ✅ automation_rules

### Functions (9)
- ✅ update_updated_at_column()
- ✅ get_user_role()
- ✅ has_role()
- ✅ is_master()
- ✅ is_master_user()
- ✅ can_access_master_features()
- ✅ user_owns_device()
- ✅ user_owns_widget()
- ✅ get_master_kpis()

### Views (5)
- ✅ v_master_kpis
- ✅ v_devices_overview
- ✅ v_users_overview
- ✅ v_alerts_recent
- ✅ v_audit_recent

### RLS Policies
- ✅ All tables have RLS enabled
- ✅ User isolation (users see only their data)
- ✅ Master override (masters see all data)

---

## ⚠️ Common Issues

### "table already exists"
✅ **Safe to ignore** - scripts use `IF NOT EXISTS`

### "permission denied"
❌ **Run as postgres user** or check your project permissions

### "auth.uid() does not exist"
❌ **You're not authenticated** - sign up through app first

### Views return empty
❌ **Not a master** - grant yourself master role (see Step 3)

---

## 🎯 Success Criteria

Your migration is successful when:

1. ✅ All tables visible in Supabase Table Editor
2. ✅ Master views return data
3. ✅ Application loads without errors
4. ✅ You can create devices/widgets
5. ✅ Master dashboard displays KPIs

---

## 🆘 Need Help?

If migrations fail:

1. Check Supabase logs: Dashboard → Logs
2. Verify you're running scripts in order (01 → 05)
3. Ensure you have a user account created
4. Check you're authenticated in SQL Editor
5. Verify role assignment worked

---

## 🔄 Full Reset (if needed)

To start completely fresh:

```sql
-- ⚠️ WARNING: Deletes ALL data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run all 5 scripts
```

---

**You're ready to rebuild! 🎉**

Start with Script 1 and work your way through. The entire process takes ~5 minutes.
