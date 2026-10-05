# SIPK COMMAND CENTER — Vercel + Supabase

1. Supabase: table `public.sipk_kv` must exist.
2. Vercel Environment Variables (Production):
   - `SUPABASE_URL` = https://PROJECT.supabase.co
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase Secret key
3. Deploy this folder to the Vercel project you want to use.
4. Test: `/api/health` must return `{ "ok": true, "database": "SUPABASE" }`.

The frontend keeps the legacy Firebase-style module API through `modules/supabase-firebase-compat.js`, but data is stored in Supabase. No Firebase SDK is loaded.
