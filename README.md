# TaskFlow - Modern Supabase Todo & Task Manager

A modern, responsive task management application built with **React**, **Vite**, **Tailwind CSS v4**, and **Supabase** for authentication and data storage.

---

## Features

- **Authentication**: Email & password Sign In / Sign Up, persistent sessions, and protected dashboard.
- **Task Management**:
  - Add tasks with title (required), optional description, due date, priority (Low / Medium / High), and category (Work, Personal, Study, Health, Finance, or custom).
  - Inline edit and delete tasks (with confirmation dialog).
  - Complete/incomplete toggle with animated checkbox and strike-through styling.
  - Due date tracking with red highlight for overdue tasks and amber badge for tasks due today.
- **Search & Filters**:
  - Real-time search by task title or description.
  - Status filters: All, Active, Completed.
  - Priority and category filter dropdowns.
  - Sorting: Newest first, Due Date, Priority (High to Low), or Drag & Drop manual order.
- **Optimistic UI Updates**: State updates instantly in the UI and automatically rolls back with an error toast if a database request fails.
- **Theme**: Dark and light mode toggle with persistent localStorage preference.
- **Progress Tracking**: Dynamic completion counter ("X of Y tasks completed") and "Clear completed" with one click.
- **Drag & Drop**: Reorder tasks in manual mode with smooth visual feedback.

---

## Supabase Setup Instructions

### 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a free project.
2. In your Supabase Dashboard, navigate to **Project Settings** > **API**.
3. Copy your **Project URL** and **anon public API Key**.

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your credentials:
```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
```

> **Note**: You can also configure your credentials directly inside the app by clicking the **"Supabase Connected / Local Workspace"** button in the header.

### 3. Create Database Table & Row Level Security (RLS)
Open the **SQL Editor** in your Supabase dashboard and run the following script:

```sql
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
```

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
