import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read config from environment variables (or localStorage override for live UI config)
const getCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('taskflow_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('taskflow_supabase_anon_key') : null;

  const url = (localUrl || envUrl || '').trim();
  const anonKey = (localKey || envKey || '').trim();

  const isConfigured = Boolean(
    url &&
    url.startsWith('https://') &&
    !url.includes('your-project-id.supabase.co') &&
    anonKey &&
    anonKey.length > 20 &&
    !anonKey.includes('your-anon-public-key')
  );

  return { url, anonKey, isConfigured };
};

const creds = getCredentials();

export const supabaseUrl = creds.url;
export const supabaseAnonKey = creds.anonKey;
export const isSupabaseConfigured = creds.isConfigured;

// Initialize Supabase Client (safe fallback URL to avoid runtime crashes if env vars are unset)
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? creds.url : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured ? creds.anonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const saveCustomSupabaseConfig = (url: string, key: string) => {
  if (url && key) {
    localStorage.setItem('taskflow_supabase_url', url.trim());
    localStorage.setItem('taskflow_supabase_anon_key', key.trim());
    window.location.reload();
  }
};

export const clearCustomSupabaseConfig = () => {
  localStorage.removeItem('taskflow_supabase_url');
  localStorage.removeItem('taskflow_supabase_anon_key');
  window.location.reload();
};

export const SUPABASE_SETUP_SQL = `-- Run this in your Supabase SQL Editor:
-- 1. Create the todos table
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  category text default 'General',
  due_date text,
  completed boolean default false,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.todos enable row level security;

-- 3. Row Level Security Policies
create policy "Users can select own todos" on public.todos
  for select using (auth.uid() = user_id);

create policy "Users can insert own todos" on public.todos
  for insert with check (auth.uid() = user_id);

create policy "Users can update own todos" on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own todos" on public.todos
  for delete using (auth.uid() = user_id);

-- 4. Fast Sorting Index
create index if not exists idx_todos_user_sort on public.todos (user_id, sort_order, created_at desc);
`;
