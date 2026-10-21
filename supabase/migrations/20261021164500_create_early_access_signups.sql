-- ChainForge Production Backend: Early Access Signups Table
create table if not exists public.early_access_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'Builder',
  stage text not null default 'Idea',
  blockchain text not null default 'Agnostic',
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.early_access_signups enable row level security;

-- Enforce least-privilege: Only server-side service_role (Edge Functions) can insert and view.
-- No public anonymous access is granted.
