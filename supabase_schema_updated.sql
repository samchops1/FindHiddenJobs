-- Updated FindHiddenJobs.com Database Schema for Supabase
-- This schema matches the Drizzle definitions in server/db/schema.ts
-- Run these SQL commands in your Supabase SQL Editor

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Jobs table (scraped job data) - existing from original schema
create table if not exists public.jobs (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  company text not null,
  location text,
  description text,
  url text not null unique,
  logo text,
  platform text,
  tags text[],
  posted_at timestamptz,
  scraped_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Search history - existing from original schema
create table if not exists public.searches (
  id uuid default uuid_generate_v4() primary key,
  query text not null,
  platform text not null,
  result_count text,
  searched_at timestamptz default now()
);

-- User preferences table - updated to match Drizzle schema exactly
create table if not exists public.user_preferences (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null unique,
  job_types jsonb default '[]',
  industries jsonb default '[]',
  locations jsonb default '[]',
  experience_level varchar(50),
  desired_salary jsonb,
  resume_url text,
  resume_analysis jsonb,
  email_notifications boolean default true,
  notification_time varchar(5) default '21:00',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Saved jobs table - updated to match Drizzle schema
create table if not exists public.saved_jobs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  job_url text not null,
  job_title text not null,
  company text not null,
  location text,
  platform varchar(50),
  saved_at timestamptz default now(),
  applied boolean default false,
  applied_at timestamptz,
  application_status varchar(50),
  notes text,
  job_data jsonb,
  unique(user_id, job_url)
);

-- Job applications table - matches Drizzle schema
create table if not exists public.job_applications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  saved_job_id uuid references public.saved_jobs,
  job_url text not null,
  job_title text not null,
  company text not null,
  applied_at timestamptz default now(),
  status varchar(50) default 'applied',
  follow_up_date timestamptz,
  interview_dates jsonb,
  notes text
);

-- Email logs table - matches Drizzle schema
create table if not exists public.email_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  email_type varchar(50) not null,
  sent_at timestamptz default now(),
  jobs_sent text[],
  opened boolean default false,
  opened_at timestamptz,
  clicked_jobs text[] default '{}'
);

-- User search history table - matches Drizzle schema
create table if not exists public.search_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  query text not null,
  filters jsonb,
  results_count integer,
  clicked_jobs text[] default '{}',
  searched_at timestamptz default now()
);

-- Resume analysis table - matches Drizzle schema
create table if not exists public.resume_analysis (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  file_name text not null,
  file_url text not null,
  analysis jsonb not null,
  analyzed_at timestamptz default now()
);

-- Indexes for better performance
create index if not exists idx_jobs_scraped_at on public.jobs(scraped_at desc);
create index if not exists idx_jobs_company on public.jobs(company);
create index if not exists idx_jobs_platform on public.jobs(platform);
create index if not exists idx_saved_jobs_user_id on public.saved_jobs(user_id);
create index if not exists idx_saved_jobs_saved_at on public.saved_jobs(saved_at desc);
create index if not exists idx_applications_user_id on public.job_applications(user_id);
create index if not exists idx_applications_applied_at on public.job_applications(applied_at desc);
create index if not exists idx_user_preferences_user_id on public.user_preferences(user_id);
create index if not exists idx_resume_analysis_user_id on public.resume_analysis(user_id);
create index if not exists idx_email_logs_user_id on public.email_logs(user_id);
create index if not exists idx_search_history_user_id on public.search_history(user_id);

-- Row Level Security (RLS) Policies
alter table public.user_preferences enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.resume_analysis enable row level security;
alter table public.email_logs enable row level security;
alter table public.search_history enable row level security;

-- RLS Policies for user_preferences
drop policy if exists "Users can view own preferences" on public.user_preferences;
drop policy if exists "Users can insert own preferences" on public.user_preferences;
drop policy if exists "Users can update own preferences" on public.user_preferences;

create policy "Users can view own preferences" on public.user_preferences
  for select using (auth.uid() = user_id);

create policy "Users can insert own preferences" on public.user_preferences
  for insert with check (auth.uid() = user_id);

create policy "Users can update own preferences" on public.user_preferences
  for update using (auth.uid() = user_id);

-- RLS Policies for saved_jobs
drop policy if exists "Users can view own saved jobs" on public.saved_jobs;
drop policy if exists "Users can insert own saved jobs" on public.saved_jobs;
drop policy if exists "Users can update own saved jobs" on public.saved_jobs;
drop policy if exists "Users can delete own saved jobs" on public.saved_jobs;

create policy "Users can view own saved jobs" on public.saved_jobs
  for select using (auth.uid() = user_id);

create policy "Users can insert own saved jobs" on public.saved_jobs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own saved jobs" on public.saved_jobs
  for update using (auth.uid() = user_id);

create policy "Users can delete own saved jobs" on public.saved_jobs
  for delete using (auth.uid() = user_id);

-- RLS Policies for job_applications
drop policy if exists "Users can view own applications" on public.job_applications;
drop policy if exists "Users can insert own applications" on public.job_applications;
drop policy if exists "Users can update own applications" on public.job_applications;

create policy "Users can view own applications" on public.job_applications
  for select using (auth.uid() = user_id);

create policy "Users can insert own applications" on public.job_applications
  for insert with check (auth.uid() = user_id);

create policy "Users can update own applications" on public.job_applications
  for update using (auth.uid() = user_id);

-- RLS Policies for resume_analysis
drop policy if exists "Users can view own resume analysis" on public.resume_analysis;
drop policy if exists "Users can insert own resume analysis" on public.resume_analysis;

create policy "Users can view own resume analysis" on public.resume_analysis
  for select using (auth.uid() = user_id);

create policy "Users can insert own resume analysis" on public.resume_analysis
  for insert with check (auth.uid() = user_id);

-- RLS Policies for email_logs
drop policy if exists "Users can view own email logs" on public.email_logs;

create policy "Users can view own email logs" on public.email_logs
  for select using (auth.uid() = user_id);

-- RLS Policies for search_history
drop policy if exists "Users can view own search history" on public.search_history;
drop policy if exists "Users can insert own search history" on public.search_history;

create policy "Users can view own search history" on public.search_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own search history" on public.search_history
  for insert with check (auth.uid() = user_id);

-- Function to automatically set updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for user_preferences updated_at
drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- Function to clean up old jobs (optional, for maintenance)
create or replace function public.cleanup_old_jobs()
returns void as $$
begin
  delete from public.jobs 
  where scraped_at < now() - interval '7 days';
end;
$$ language plpgsql;