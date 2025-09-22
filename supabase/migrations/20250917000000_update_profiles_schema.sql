-- Update profiles schema to align with auth.users trigger payload

-- Drop outdated policies referencing the removed user_id column
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Ensure the email column exists before data backfill
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- When the legacy user_id column is present, backfill data and align identifiers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'user_id'
  ) THEN
    UPDATE public.profiles p
    SET email = COALESCE(p.email, u.email)
    FROM auth.users u
    WHERE p.user_id = u.id;

    UPDATE public.profiles
    SET id = user_id
    WHERE user_id IS NOT NULL
      AND id <> user_id;
  END IF;
END;
$$;

-- Ensure all profiles now have the correct email using the primary key
UPDATE public.profiles p
SET email = COALESCE(p.email, u.email)
FROM auth.users u
WHERE p.id = u.id;

-- Remove the obsolete user_id column and default on id
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS user_id,
  ALTER COLUMN id DROP DEFAULT;

-- Reinstate the foreign key constraint for id -> auth.users(id)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Recreate RLS policies for the updated schema
CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON public.profiles
FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE USING (id = auth.uid());

-- Ensure the handle_new_user trigger matches the latest definition
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  -- Also create broker settings for new user
  INSERT INTO public.broker_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
