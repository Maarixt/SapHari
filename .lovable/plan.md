

# Fix: Restore the Correct (New) Supabase Anon Key

## Problem

When you clicked "Reset JWT Keys" in Supabase, it generated a **new** anon key and **invalidated** the old one. In a previous fix, we mistakenly reverted back to the old (now-dead) key. That is why every auth request returns "Invalid API key".

## The Two Keys

| Key | iat (issued at) | Ending | Status |
|-----|-----------------|--------|--------|
| OLD | 1757596111 | `...mZNoXWuv...PlE` | DEAD (invalidated by reset) |
| NEW | 1771096589 | `...K-ECqKpbcx...BWyU` | VALID (current) |

The new key is:
`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZGVvbWd0a2JlaHZiZmhpcHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTY1ODksImV4cCI6MjA4NjQ1NjU4OX0.K-ECqKpbcxbMka60WJwQ8FBXOgNiqbpJxqIxmn7BWyU`

## Changes (3 files)

### 1. `.env` -- Update both ANON_KEY and PUBLISHABLE_KEY to the new key

Replace both key values with the new valid key.

### 2. `src/integrations/supabase/client.ts` -- Update hardcoded fallback

Replace the hardcoded fallback anon key string with the new key so it works even without `.env`.

### 3. Verification

After applying, login at `/login` should succeed (200 from `/auth/v1/token` instead of 401).

## Technical Details

- Only `.env` and `src/integrations/supabase/client.ts` need changes
- All three key references (`VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and the hardcoded fallback) must use the same new key
- No edge function changes needed -- they use `SUPABASE_ANON_KEY` which is auto-injected by Supabase and was already rotated server-side

