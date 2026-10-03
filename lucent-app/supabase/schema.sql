-- ==============================================================================
-- LUCENT — SUPABASE DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Profiles / User Settings
create table if not exists public.profiles (
  id text primary key,
  name text not null default 'Scholar',
  email text default '',
  avatar text default 'S',
  exam_date text default '',
  daily_study_goal_minutes integer default 180,
  deadline_reminders boolean default true,
  coverage_alerts boolean default true,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Courses
create table if not exists public.courses (
  id text primary key,
  name text not null,
  code text default '',
  term text default 'Autumn 2026',
  exam_date text default '',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Documents & Materials
create table if not exists public.documents (
  id text primary key,
  name text not null,
  type text not null,
  size text default '',
  upload_date timestamptz default timezone('utc'::text, now()) not null,
  course_id text references public.courses(id) on delete set null,
  raw_text text,
  extracted_summary text,
  is_starred boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Topics & Curriculum Map
create table if not exists public.topics (
  id text primary key,
  name text not null,
  course_id text references public.courses(id) on delete cascade,
  subtopics jsonb default '[]'::jsonb,
  importance text default 'Medium',
  weight integer default 1,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 5. Topic Coverages
create table if not exists public.coverages (
  id text primary key,
  topic_id text references public.topics(id) on delete cascade,
  status text not null default 'uncovered',
  confidence text not null default 'Low',
  last_studied timestamptz,
  notes text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 6. Deadlines & Exam Milestones
create table if not exists public.deadlines (
  id text primary key,
  title text not null,
  course_name text not null,
  date text not null,
  urgency text default 'Medium',
  weight integer default 20,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 7. Active Study Plans & Adaptations
create table if not exists public.study_plans (
  id text primary key default 'active_plan',
  summary text,
  days jsonb default '[]'::jsonb,
  adaptation jsonb,
  completed_sessions jsonb default '{}'::jsonb,
  feedback_log jsonb default '[]'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 8. AI Tutor Conversations
create table if not exists public.tutor_conversations (
  id text primary key,
  title text default 'Study Session',
  current_topic_id text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 9. AI Tutor Messages
create table if not exists public.tutor_messages (
  id text primary key,
  conversation_id text references public.tutor_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  sources jsonb default '[]'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.documents enable row level security;
alter table public.topics enable row level security;
alter table public.coverages enable row level security;
alter table public.deadlines enable row level security;
alter table public.study_plans enable row level security;
alter table public.tutor_conversations enable row level security;
alter table public.tutor_messages enable row level security;

-- Public / Service role access policies for anonymous and authenticated Lucent usage
create policy "Allow all operations for anon on profiles" on public.profiles for all using (true) with check (true);
create policy "Allow all operations for anon on courses" on public.courses for all using (true) with check (true);
create policy "Allow all operations for anon on documents" on public.documents for all using (true) with check (true);
create policy "Allow all operations for anon on topics" on public.topics for all using (true) with check (true);
create policy "Allow all operations for anon on coverages" on public.coverages for all using (true) with check (true);
create policy "Allow all operations for anon on deadlines" on public.deadlines for all using (true) with check (true);
create policy "Allow all operations for anon on study_plans" on public.study_plans for all using (true) with check (true);
create policy "Allow all operations for anon on tutor_conversations" on public.tutor_conversations for all using (true) with check (true);
create policy "Allow all operations for anon on tutor_messages" on public.tutor_messages for all using (true) with check (true);

-- Insert default user profile if not exists
insert into public.profiles (id, name, email, avatar, exam_date, daily_study_goal_minutes, deadline_reminders, coverage_alerts)
values ('user_1', 'Scholar', '', 'S', '', 180, true, true)
on conflict (id) do nothing;
