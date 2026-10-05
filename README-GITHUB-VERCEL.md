# SIPK Command Center — Supabase + Vercel

Paket ini disiapkan untuk repository GitHub yang sudah terhubung ke project Vercel `amkmonitor2`.

## Backend
- Supabase REST API melalui `/api/db`
- Health check: `/api/health`
- Environment variables yang diperlukan di Vercel Production:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Database
Table yang digunakan:
`public.sipk_kv(path text primary key, value jsonb, updated_at timestamptz not null default now())`

## Catatan
Jangan memasukkan `SUPABASE_SERVICE_ROLE_KEY` ke file HTML, GitHub, atau ZIP. Simpan hanya di Vercel Environment Variables.
