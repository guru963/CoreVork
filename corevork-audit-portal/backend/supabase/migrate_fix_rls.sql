-- ─────────────────────────────────────────────────────────────
--  CoreVork — COMPLETE DATABASE RESET & FIX (HIGH PERFORMANCE)
--  Paste this ENTIRE script into Supabase SQL Editor → Run
--  Safe to run multiple times
-- ─────────────────────────────────────────────────────────────

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  STEP 1: NUKE ALL EXISTING POLICIES & TRIGGER            ║
-- ╚═══════════════════════════════════════════════════════════╝
do $$
declare
  pol record;
begin
  -- Drop all policies on our tables
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('organizations','profiles','checklists','sections','questions','audits','responses')
  loop
    execute format('drop policy if exists %I on %I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- Drop storage policies if they exist
drop policy if exists "audit_photos_insert" on storage.objects;
drop policy if exists "audit_photos_select" on storage.objects;

-- Drop trigger first
drop trigger if exists on_auth_user_created on auth.users;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  STEP 2: ALTER CONSTRAINTS & SET DEFAULTS                 ║
-- ╚═══════════════════════════════════════════════════════════╝
-- Drop profiles foreign key constraint to auth.users if it exists
-- to allow inserting placeholder profiles for invited users
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Make sure profiles has a default value for id so the client doesn't need to specify it when inserting placeholders
alter table public.profiles alter column id set default gen_random_uuid();

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  STEP 3: CREATE HELPER FUNCTIONS WITH SEARCH_PATH        ║
-- ╚═══════════════════════════════════════════════════════════╝
create or replace function get_auth_org_id()
returns uuid
language sql security definer stable set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function get_auth_role()
returns text
language sql security definer stable set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- Trigger function with explicit search_path = public
create or replace function public.handle_new_user()
returns trigger as $$
declare
  org_id uuid;
begin
  -- Create org if org_name metadata provided
  if new.raw_user_meta_data->>'org_name' is not null then
    insert into public.organizations (name)
    values (new.raw_user_meta_data->>'org_name')
    returning id into org_id;
  end if;

  insert into public.profiles (id, email, full_name, org_id, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    org_id,
    'admin'  -- First user in org is admin
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Re-create trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  STEP 4: ENABLE RLS ON ALL TABLES                        ║
-- ╚═══════════════════════════════════════════════════════════╝
alter table organizations  enable row level security;
alter table profiles       enable row level security;
alter table checklists     enable row level security;
alter table sections       enable row level security;
alter table questions      enable row level security;
alter table audits         enable row level security;
alter table responses      enable row level security;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  STEP 5: HIGH-PERFORMANCE RLS POLICIES (NO SLOW JOINS)   ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ── ORGANIZATIONS ────────────────────────────────────────────
-- Allow all authenticated users to read organizations (fast, no joins)
create policy "org_select" on organizations for select
  to authenticated using (true);

create policy "org_insert" on organizations for insert
  to authenticated with check (true);

-- ── PROFILES ─────────────────────────────────────────────────
-- Allow all authenticated users to read profiles (fast, no recursion)
create policy "profiles_select" on profiles for select
  to authenticated using (true);

create policy "profiles_insert" on profiles for insert
  to authenticated with check (true);

create policy "profiles_update" on profiles for update
  using (id = auth.uid());

-- ── CHECKLISTS / SECTIONS / QUESTIONS ────────────────────────
create policy "checklists_select" on checklists for select
  to authenticated using (true);

create policy "sections_select" on sections for select
  to authenticated using (true);

create policy "questions_select" on questions for select
  to authenticated using (true);

-- ── AUDITS ───────────────────────────────────────────────────
-- Allow all authenticated users to read audits
create policy "audits_select" on audits for select
  to authenticated using (true);

create policy "audits_insert" on audits for insert
  to authenticated with check (inspector_id = auth.uid());

-- Allow the inspector or an admin to update the audit
create policy "audits_update" on audits for update
  using (inspector_id = auth.uid() or get_auth_role() = 'admin');

-- ── RESPONSES ────────────────────────────────────────────────
-- Allow all authenticated users to read/write responses (eliminates slow subqueries)
create policy "responses_select" on responses for select
  to authenticated using (true);

create policy "responses_insert" on responses for insert
  to authenticated with check (true);

create policy "responses_update" on responses for update
  to authenticated using (true);

-- ── STORAGE ──────────────────────────────────────────────────
create policy "audit_photos_insert" on storage.objects for insert
  to authenticated with check (bucket_id = 'audit-photos');

create policy "audit_photos_select" on storage.objects for select
  using (bucket_id = 'audit-photos');

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  STEP 6: SELF-HEAL EXISTING BROKEN USERS                 ║
-- ╚═══════════════════════════════════════════════════════════╝
do $$
declare
  user_row record;
  new_org_id uuid;
begin
  for user_row in 
    select u.id, u.email, coalesce(u.raw_user_meta_data->>'org_name', 'My Organisation') as org_name
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null or p.org_id is null
  loop
    -- Create organization
    insert into public.organizations (name)
    values (user_row.org_name)
    returning id into new_org_id;
    
    -- Insert or update profile
    insert into public.profiles (id, email, full_name, org_id, role)
    values (
      user_row.id, 
      user_row.email, 
      coalesce((select raw_user_meta_data->>'full_name' from auth.users where id = user_row.id), user_row.email), 
      new_org_id, 
      'admin'
    )
    on conflict (id) do update 
    set org_id = new_org_id;
  end loop;
end $$;
