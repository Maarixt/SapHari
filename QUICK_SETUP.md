# Quick Database Setup - SapHari

Your database was wiped. Follow these 3 simple steps to restore it:

## Step 1: Run the Migration

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/wrdeomgtkbehvbfhiprm/sql/new
2. Copy **ALL** content from `supabase-rebuild/00_complete_rebuild.sql`
3. Paste it into the SQL editor
4. Click **Run** (or press Ctrl+Enter)

You should see: ✅ Database rebuild complete!

## Step 2: Assign Master Role to Your Account

Run this SQL (replace `YOUR_USER_ID` with your actual user ID):

```sql
-- Get your user ID first
SELECT id, email FROM auth.users;

-- Then assign master role (replace YOUR_USER_ID)
INSERT INTO public.user_roles (user_id, role) 
VALUES ('YOUR_USER_ID', 'master')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Step 3: Verify Setup

Run this to confirm everything works:

```sql
SELECT * FROM public.devices;
SELECT * FROM public.user_roles WHERE role = 'master';
```

## Done! 🎉

Refresh your SapHari dashboard and try adding a device again.

---

### Troubleshooting

**Still getting "table not found"?**
- Wait 10-30 seconds for Supabase to update the schema cache
- Hard refresh your browser (Ctrl+Shift+R)

**Need to find your user ID?**
- Log into your app
- Open browser console (F12)
- Type: `localStorage` and look for auth data
- Or run: `SELECT id, email FROM auth.users;` in SQL editor
