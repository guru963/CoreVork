-- ─────────────────────────────────────────────────────────────
--  CoreVork Audit Portal — Supabase Schema & Policies
--  Run this in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

-- ─── 1. EXTENSIONS ───────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── 2. CLEAN UP (DROP OLD TRIGGERS / FUNCTIONS) ──────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop function if exists get_auth_org_id();
drop function if exists get_auth_role();

-- ─── 3. TABLES ───────────────────────────────────────────────

-- Organizations
create table if not exists organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  logo_url    text,
  created_at  timestamptz default now()
);

-- Profiles (linked to Supabase Auth)
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid references organizations(id),
  full_name   text,
  email       text,
  role        text not null default 'inspector' check (role in ('admin', 'inspector', 'viewer')),
  created_at  timestamptz default now()
);

-- Checklists (System libraries + Custom AI-generated checklists)
create table if not exists checklists (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  standard    text not null,           -- 'India Factories Act' | 'OSHA' | 'ISO 45001' etc.
  description text,
  is_active   boolean default true,
  is_custom   boolean default false,
  org_id      uuid references organizations(id) on delete cascade,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- Sections
create table if not exists sections (
  id           uuid primary key default uuid_generate_v4(),
  checklist_id uuid not null references checklists(id) on delete cascade,
  title        text not null,
  order_index  int not null default 0,
  created_at   timestamptz default now()
);

-- Questions
create table if not exists questions (
  id          uuid primary key default uuid_generate_v4(),
  section_id  uuid not null references sections(id) on delete cascade,
  text        text not null,
  guidance    text,
  order_index int not null default 0,
  created_at  timestamptz default now()
);

-- Audits
create table if not exists audits (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid references organizations(id) on delete cascade,
  checklist_id     uuid not null references checklists(id),
  inspector_id     uuid not null references profiles(id),
  site_name        text not null,
  site_location    text,
  status           text not null default 'draft' check (status in ('draft', 'submitted')),
  compliance_score int check (compliance_score between 0 and 100),
  submitted_at     timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Responses
create table if not exists responses (
  id          uuid primary key default uuid_generate_v4(),
  audit_id    uuid not null references audits(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  answer      text check (answer in ('yes', 'no', 'na')),
  notes       text,
  photo_url   text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (audit_id, question_id)
);

-- Corrective Actions (AI-suggested remedies for failed audits)
create table if not exists corrective_actions (
  id            uuid primary key default uuid_generate_v4(),
  audit_id      uuid not null references audits(id) on delete cascade,
  org_id        uuid references organizations(id) on delete cascade,
  assignee_id   uuid references profiles(id) on delete set null,
  question_text text not null,
  section_title text not null,
  action        text not null,
  priority      text not null check (priority in ('low', 'medium', 'high', 'critical')),
  status        text not null default 'open' check (status in ('open', 'resolved')),
  due_date      date,
  notes         text,
  resolved_at   timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── 4. TRIGGERS & PL/pgSQL FUNCTIONS ─────────────────────────

-- Auto-create profile on signup (with invite metadata handling)
create or replace function handle_new_user()
returns trigger as $$
declare
  assigned_org_id uuid;
  assigned_role text;
begin
  -- 1. Determine Organization ID
  if new.raw_user_meta_data->>'org_id' is not null then
    assigned_org_id := (new.raw_user_meta_data->>'org_id')::uuid;
  elsif new.raw_user_meta_data->>'org_name' is not null then
    insert into organizations (name)
    values (new.raw_user_meta_data->>'org_name')
    returning id into assigned_org_id;
  end if;

  -- 2. Determine Role (default to metadata role, fall back to 'admin' if creating org, or 'inspector')
  if new.raw_user_meta_data->>'role' is not null then
    assigned_role := new.raw_user_meta_data->>'role';
  elsif new.raw_user_meta_data->>'org_name' is not null then
    assigned_role := 'admin';
  else
    assigned_role := 'inspector';
  end if;

  -- 3. Upsert user Profile
  insert into profiles (id, email, full_name, org_id, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    assigned_org_id,
    assigned_role
  )
  on conflict (id) do update
  set
    org_id = coalesce(profiles.org_id, excluded.org_id),
    role = coalesce(profiles.role, excluded.role),
    full_name = coalesce(profiles.full_name, excluded.full_name);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── 5. RLS SECURITY DEFINER HELPER FUNCTIONS ──────────────────
-- Bypasses RLS recursion by using SECURITY DEFINER to get user context safely.
create or replace function get_auth_org_id()
returns uuid
language sql security definer set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function get_auth_role()
returns text
language sql security definer set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- ─── 6. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────

alter table organizations   enable row level security;
alter table profiles        enable row level security;
alter table checklists      enable row level security;
alter table sections        enable row level security;
alter table questions       enable row level security;
alter table audits          enable row level security;
alter table responses       enable row level security;
alter table corrective_actions enable row level security;

-- Organizations
drop policy if exists "org_select" on organizations;
create policy "org_select" on organizations for select
  using (id = get_auth_org_id());

-- Profiles
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or org_id = get_auth_org_id());

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles for update
  using (id = auth.uid());

-- Checklists
drop policy if exists "checklists_select" on checklists;
create policy "checklists_select" on checklists for select to authenticated
  using (org_id is null or org_id = get_auth_org_id());

drop policy if exists "checklists_insert" on checklists;
create policy "checklists_insert" on checklists for insert to authenticated
  with check (org_id = get_auth_org_id() and created_by = auth.uid());

-- Sections
drop policy if exists "sections_select" on sections;
create policy "sections_select" on sections for select to authenticated
  using (checklist_id in (select id from checklists));

drop policy if exists "sections_insert" on sections;
create policy "sections_insert" on sections for insert to authenticated
  with check (checklist_id in (select id from checklists where created_by = auth.uid()));

-- Questions
drop policy if exists "questions_select" on questions;
create policy "questions_select" on questions for select to authenticated
  using (section_id in (select id from sections));

drop policy if exists "questions_insert" on questions;
create policy "questions_insert" on questions for insert to authenticated
  with check (section_id in (select id from sections where checklist_id in (select id from checklists where created_by = auth.uid())));

-- Audits
drop policy if exists "audits_select" on audits;
create policy "audits_select" on audits for select to authenticated
  using (org_id = get_auth_org_id());

drop policy if exists "audits_insert" on audits;
create policy "audits_insert" on audits for insert to authenticated
  with check (inspector_id = auth.uid() and org_id = get_auth_org_id());

drop policy if exists "audits_update" on audits;
create policy "audits_update" on audits for update to authenticated
  using (inspector_id = auth.uid() or get_auth_role() = 'admin');

-- Responses
drop policy if exists "responses_select" on responses;
create policy "responses_select" on responses for select to authenticated
  using (audit_id in (select id from audits where org_id = get_auth_org_id()));

drop policy if exists "responses_insert" on responses;
create policy "responses_insert" on responses for insert to authenticated
  with check (audit_id in (select id from audits where inspector_id = auth.uid()));

drop policy if exists "responses_update" on responses;
create policy "responses_update" on responses for update to authenticated
  using (audit_id in (select id from audits where inspector_id = auth.uid()));

-- Corrective Actions
drop policy if exists "corrective_actions_select" on corrective_actions;
create policy "corrective_actions_select" on corrective_actions for select to authenticated
  using (org_id = get_auth_org_id());

drop policy if exists "corrective_actions_insert" on corrective_actions;
create policy "corrective_actions_insert" on corrective_actions for insert to authenticated
  with check (org_id = get_auth_org_id());

drop policy if exists "corrective_actions_update" on corrective_actions;
create policy "corrective_actions_update" on corrective_actions for update to authenticated
  using (org_id = get_auth_org_id());

-- ─── 7. STORAGE POLICIES ─────────────────────────────────────
-- Create a public bucket named "audit-photos" in the Supabase Dashboard first.
-- Then run the following RLS rules for storage:

drop policy if exists "audit_photos_insert" on storage.objects;
create policy "audit_photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'audit-photos');

drop policy if exists "audit_photos_select" on storage.objects;
create policy "audit_photos_select" on storage.objects for select to authenticated
  using (bucket_id = 'audit-photos');


-- ─── 8. SEED DATA ────────────────────────────────────────────

-- Delete old seed checklists if they exist to avoid duplicate key errors
delete from checklists where id in (
  '11111111-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000004',
  '22222222-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000004',
  '33333333-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000002',
  '33333333-0000-0000-0000-000000000003',
  '33333333-0000-0000-0000-000000000004'
);

-- Library Checklists
insert into checklists (id, title, standard, description, is_custom) values
  ('11111111-0000-0000-0000-000000000001', 'Fire Safety Audit', 'India Factories Act', 'Compliance with fire safety provisions under the Factories Act 1948 and relevant state rules.', false),
  ('11111111-0000-0000-0000-000000000002', 'Machine Guarding Audit', 'India Factories Act', 'Inspection of mechanical hazards and guarding requirements per Section 21-27.', false),
  ('11111111-0000-0000-0000-000000000003', 'Hazardous Processes Audit', 'India Factories Act', 'Assessment of hazardous chemical handling and storage per Chapter IVA.', false),
  ('11111111-0000-0000-0000-000000000004', 'Workers Welfare Audit', 'India Factories Act', 'Canteen, rest rooms, first aid and welfare provisions per Chapter V.', false),
  ('22222222-0000-0000-0000-000000000001', 'General Industry Safety', 'OSHA', 'General industry standards inspection per OSHA 29 CFR 1910.', false),
  ('22222222-0000-0000-0000-000000000002', 'Electrical Safety Audit', 'OSHA', 'Electrical wiring, lockout/tagout, and PPE requirements per OSHA 1910.303-335.', false),
  ('22222222-0000-0000-0000-000000000003', 'Hazard Communication', 'OSHA', 'GHS labelling, SDS availability and employee training per OSHA 1910.1200.', false),
  ('22222222-0000-0000-0000-000000000004', 'Personal Protective Equipment', 'OSHA', 'PPE selection, provision, training and maintenance per OSHA 1910.132-138.', false),
  ('33333333-0000-0000-0000-000000000001', 'ISO 45001 Gap Assessment', 'ISO 45001', 'Gap analysis against all clauses of ISO 45001:2018 OH&S management system.', false),
  ('33333333-0000-0000-0000-000000000002', 'Risk & Opportunity Review', 'ISO 45001', 'Hazard identification, risk assessment and opportunity evaluation per Clause 6.', false),
  ('33333333-0000-0000-0000-000000000003', 'Operational Controls Audit', 'ISO 45001', 'Evaluation of operational controls and emergency preparedness per Clause 8.', false),
  ('33333333-0000-0000-0000-000000000004', 'Performance Evaluation', 'ISO 45001', 'Monitoring, measurement, internal audit and management review per Clause 9.', false);


-- ─── SEED SECTIONS & QUESTIONS ───

-- 1. Fire Safety Audit (11111111-0000-0000-0000-000000000001)
insert into sections (id, checklist_id, title, order_index) values
  ('aaaaaaaa-0001-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Fire Detection & Alarm Systems', 0),
  ('aaaaaaaa-0001-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Fire Suppression & Extinguishers', 1),
  ('aaaaaaaa-0001-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Evacuation & Emergency Exits', 2),
  ('aaaaaaaa-0001-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'Fire Safety Training & Drills', 3);

insert into questions (section_id, text, guidance, order_index) values
  ('aaaaaaaa-0001-0000-0000-000000000001', 'Are smoke detectors installed in all work areas and storage rooms?', 'Check for detectors every 9m or as per NBC guidelines.', 0),
  ('aaaaaaaa-0001-0000-0000-000000000001', 'Is the fire alarm system tested at least monthly?', 'Review maintenance logs for testing frequency.', 1),
  ('aaaaaaaa-0001-0000-0000-000000000001', 'Are alarm panels clearly labelled and accessible?', 'Panel should be in an accessible, unmistakable location.', 2),
  ('aaaaaaaa-0001-0000-0000-000000000001', 'Is there a functioning public address system for evacuation alerts?', null, 3),
  ('aaaaaaaa-0001-0000-0000-000000000002', 'Are fire extinguishers mounted at designated locations throughout the facility?', 'Maximum travel distance 15m for Class A, 10m for Class B.', 0),
  ('aaaaaaaa-0001-0000-0000-000000000002', 'Are extinguisher inspection tags current (within last 12 months)?', 'Check date tags on all extinguishers.', 1),
  ('aaaaaaaa-0001-0000-0000-000000000002', 'Is the correct type of extinguisher provided for the fire risk present?', 'ABC dry powder for mixed risk, CO2 for electrical.', 2),
  ('aaaaaaaa-0001-0000-0000-000000000002', 'Is the sprinkler system (if present) operational and free from obstructions?', null, 3),
  ('aaaaaaaa-0001-0000-0000-000000000003', 'Are all emergency exits clearly marked with illuminated signage?', 'Signs must be visible in smoke conditions.', 0),
  ('aaaaaaaa-0001-0000-0000-000000000003', 'Are exit routes free from obstruction at all times?', 'No storage, equipment or locked gates on exit routes.', 1),
  ('aaaaaaaa-0001-0000-0000-000000000003', 'Are evacuation assembly points clearly identified and communicated?', null, 2),
  ('aaaaaaaa-0001-0000-0000-000000000003', 'Is emergency lighting functional along all exit routes?', 'Test by simulating mains failure.', 3),
  ('aaaaaaaa-0001-0000-0000-000000000004', 'Have all employees received fire safety induction training?', 'Training records must be documented.', 0),
  ('aaaaaaaa-0001-0000-0000-000000000004', 'Is a fire evacuation drill conducted at least twice per year?', 'Frequency as per Factories Act and state rules.', 1),
  ('aaaaaaaa-0001-0000-0000-000000000004', 'Are fire wardens appointed and trained for each floor/section?', null, 2),
  ('aaaaaaaa-0001-0000-0000-000000000004', 'Are drill records maintained and reviewed for improvement?', null, 3);

-- 2. Machine Guarding Audit (11111111-0000-0000-0000-000000000002)
insert into sections (id, checklist_id, title, order_index) values
  ('aaaaaaaa-0002-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'Point of Operation Guarding', 0),
  ('aaaaaaaa-0002-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Power Transmission Apparatus', 1);

insert into questions (section_id, text, guidance, order_index) values
  ('aaaaaaaa-0002-0000-0000-000000000001', 'Are all points of operation suitably guarded to prevent operator contact?', 'Check blades, nip points, and presses.', 0),
  ('aaaaaaaa-0002-0000-0000-000000000001', 'Are interlocks functional on machine access doors?', 'Test interlocks during operation safely.', 1),
  ('aaaaaaaa-0002-0000-0000-000000000002', 'Are all belts, pulleys, chains, and sprockets fully enclosed?', 'Inspect all drive mechanisms.', 0),
  ('aaaaaaaa-0002-0000-0000-000000000002', 'Is the machinery securely anchored to prevent walking or moving?', 'Push/pull test or verify bolts.', 1);

-- 3. Hazardous Processes Audit (11111111-0000-0000-0000-000000000003)
insert into sections (id, checklist_id, title, order_index) values
  ('aaaaaaaa-0003-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'Chemical Storage & Handling', 0),
  ('aaaaaaaa-0003-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', 'Spill Control & Emergency Response', 1);

insert into questions (section_id, text, guidance, order_index) values
  ('aaaaaaaa-0003-0000-0000-000000000001', 'Are incompatible chemicals segregated properly in storage?', 'Verify against SDS compatibility charts.', 0),
  ('aaaaaaaa-0003-0000-0000-000000000001', 'Are secondary containments in place for all hazardous liquids?', 'Must hold 110% of largest container volume.', 1),
  ('aaaaaaaa-0003-0000-0000-000000000002', 'Are spill kits fully stocked and easily accessible?', 'Check inventory against kit checklist.', 0),
  ('aaaaaaaa-0003-0000-0000-000000000002', 'Is there a clear emergency response procedure posted for chemical spills?', null, 1);

-- 4. Workers Welfare Audit (11111111-0000-0000-0000-000000000004)
insert into sections (id, checklist_id, title, order_index) values
  ('aaaaaaaa-0004-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 'Basic Amenities', 0),
  ('aaaaaaaa-0004-0000-0000-000000000002', '11111111-0000-0000-0000-000000000004', 'First Aid & Medical Facilities', 1);

insert into questions (section_id, text, guidance, order_index) values
  ('aaaaaaaa-0004-0000-0000-000000000001', 'Is clean, cool drinking water adequately provided and accessible?', 'Check water coolers and hygiene.', 0),
  ('aaaaaaaa-0004-0000-0000-000000000001', 'Are restrooms maintained, well-ventilated, and sufficient for the workforce?', 'Verify against minimum ratio requirements.', 1),
  ('aaaaaaaa-0004-0000-0000-000000000002', 'Are first aid boxes correctly stocked and easily identifiable?', 'Check expiration dates of contents.', 0),
  ('aaaaaaaa-0004-0000-0000-000000000002', 'Is there a trained first-aider present during all working shifts?', 'Verify certificates and shift rosters.', 1);

-- 5. General Industry Safety (22222222-0000-0000-0000-000000000001)
insert into sections (id, checklist_id, title, order_index) values
  ('bbbbbbbb-0001-1000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Walking & Working Surfaces', 0),
  ('bbbbbbbb-0001-1000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Housekeeping', 1);

insert into questions (section_id, text, guidance, order_index) values
  ('bbbbbbbb-0001-1000-0000-000000000001', 'Are aisles and passageways kept clear and in good repair?', 'Look for tripping hazards or damaged floors.', 0),
  ('bbbbbbbb-0001-1000-0000-000000000001', 'Are standard guardrails provided on elevated platforms?', 'Required for platforms over 4 feet high.', 1),
  ('bbbbbbbb-0001-1000-0000-000000000002', 'Is all combustible waste stored safely and removed daily?', 'Check waste bins for lids and proximity to ignition.', 0),
  ('bbbbbbbb-0001-1000-0000-000000000002', 'Are tools and equipment returned to designated areas after use?', null, 1);

-- 6. Electrical Safety Audit (22222222-0000-0000-0000-000000000002)
insert into sections (id, checklist_id, title, order_index) values
  ('bbbbbbbb-0002-1000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'Wiring and Equipment', 0),
  ('bbbbbbbb-0002-1000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Lockout/Tagout (LOTO)', 1);

insert into questions (section_id, text, guidance, order_index) values
  ('bbbbbbbb-0002-1000-0000-000000000001', 'Are all electrical panels easily accessible and free from obstruction?', 'Maintain minimum 36 inches clearance.', 0),
  ('bbbbbbbb-0002-1000-0000-000000000001', 'Are circuit breakers clearly labelled for the equipment they control?', null, 1),
  ('bbbbbbbb-0002-1000-0000-000000000002', 'Is a written energy control (LOTO) procedure established and used?', 'Check for documented procedures.', 0),
  ('bbbbbbbb-0002-1000-0000-000000000002', 'Are employees trained on LOTO procedures?', 'Review training logs.', 1);

-- 7. Hazard Communication (22222222-0000-0000-0000-000000000003)
insert into sections (id, checklist_id, title, order_index) values
  ('bbbbbbbb-0003-1000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 'Labels & SDS', 0),
  ('bbbbbbbb-0003-1000-0000-000000000002', '22222222-0000-0000-0000-000000000003', 'Training & Information', 1);

insert into questions (section_id, text, guidance, order_index) values
  ('bbbbbbbb-0003-1000-0000-000000000001', 'Are all hazardous chemical containers properly labelled?', 'Check secondary containers as well.', 0),
  ('bbbbbbbb-0003-1000-0000-000000000001', 'Are Safety Data Sheets (SDS) readily accessible to all workers?', 'Must be accessible during their work shift.', 1),
  ('bbbbbbbb-0003-1000-0000-000000000002', 'Has a written Hazard Communication Program been developed?', null, 0),
  ('bbbbbbbb-0003-1000-0000-000000000002', 'Have employees received HazCom training?', 'Verify understanding through worker interviews.', 1);

-- 8. Personal Protective Equipment (22222222-0000-0000-0000-000000000004)
insert into sections (id, checklist_id, title, order_index) values
  ('bbbbbbbb-0004-1000-0000-000000000001', '22222222-0000-0000-0000-000000000004', 'Assessment & Provision', 0),
  ('bbbbbbbb-0004-1000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 'Maintenance & Use', 1);

insert into questions (section_id, text, guidance, order_index) values
  ('bbbbbbbb-0004-1000-0000-000000000001', 'Has a workplace hazard assessment been performed to determine PPE needs?', 'Review documented hazard assessment.', 0),
  ('bbbbbbbb-0004-1000-0000-000000000001', 'Is adequate and appropriate PPE provided at no cost to employees?', null, 1),
  ('bbbbbbbb-0004-1000-0000-000000000002', 'Is PPE maintained in a sanitary and reliable condition?', 'Inspect randomly selected hard hats/goggles.', 0),
  ('bbbbbbbb-0004-1000-0000-000000000002', 'Are employees observed properly wearing required PPE?', null, 1);

-- 9. ISO 45001 Gap Assessment (33333333-0000-0000-0000-000000000001)
insert into sections (id, checklist_id, title, order_index) values
  ('cccccccc-0001-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Leadership & Worker Participation (Clause 5)', 0),
  ('cccccccc-0001-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'Planning (Clause 6)', 1),
  ('cccccccc-0001-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 'Support (Clause 7)', 2),
  ('cccccccc-0001-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 'Operation (Clause 8)', 3);

insert into questions (section_id, text, guidance, order_index) values
  ('cccccccc-0001-0000-0000-000000000001', 'Has top management demonstrated commitment to the OH&S management system?', 'Look for signed policy, resource allocation records, management review minutes.', 0),
  ('cccccccc-0001-0000-0000-000000000001', 'Is the OH&S policy documented, communicated and available to workers?', 'Policy must be dated, signed and displayed/accessible.', 1),
  ('cccccccc-0001-0000-0000-000000000001', 'Are workers and their representatives consulted in OH&S decisions?', 'Check consultation records, committee meeting minutes.', 2),
  ('cccccccc-0001-0000-0000-000000000002', 'Has the organisation identified hazards and assessed OH&S risks?', 'Review hazard register for completeness and currency.', 0),
  ('cccccccc-0001-0000-0000-000000000002', 'Are OH&S objectives established and monitored?', 'Objectives must be measurable and have assigned owners.', 1),
  ('cccccccc-0001-0000-0000-000000000002', 'Are legal and other requirements identified and kept up to date?', 'Review legal register update frequency.', 2),
  ('cccccccc-0001-0000-0000-000000000003', 'Is competence of workers performing OH&S-affecting work documented?', 'Training records, qualifications on file.', 0),
  ('cccccccc-0001-0000-0000-000000000003', 'Is OH&S information communicated internally and externally as required?', null, 1),
  ('cccccccc-0001-0000-0000-000000000003', 'Is documented information controlled and retained appropriately?', null, 2),
  ('cccccccc-0001-0000-0000-000000000004', 'Are operational controls in place for identified risks?', 'Match controls to hazard register entries.', 0),
  ('cccccccc-0001-0000-0000-000000000004', 'Is there an emergency preparedness and response plan?', 'Plan must be tested and communicated.', 1),
  ('cccccccc-0001-0000-0000-000000000004', 'Are contractors and visitors included in the OH&S management system?', null, 2);

-- 10. Risk & Opportunity Review (33333333-0000-0000-0000-000000000002)
insert into sections (id, checklist_id, title, order_index) values
  ('cccccccc-0002-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 'Hazard Identification', 0),
  ('cccccccc-0002-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 'Assessment of Risks & Opportunities', 1);

insert into questions (section_id, text, guidance, order_index) values
  ('cccccccc-0002-0000-0000-000000000001', 'Are routine and non-routine activities included in hazard identification?', 'Check maintenance, cleaning, and contractor activities.', 0),
  ('cccccccc-0002-0000-0000-000000000001', 'Are human factors considered in identifying hazards?', 'Consider ergonomics, stress, and behavioral safety.', 1),
  ('cccccccc-0002-0000-0000-000000000002', 'Are risks evaluated using a consistent methodology?', 'Review risk assessment matrix/criteria.', 0),
  ('cccccccc-0002-0000-0000-000000000002', 'Have opportunities to improve OH&S performance been identified?', null, 1);

-- 11. Operational Controls Audit (33333333-0000-0000-0000-000000000003)
insert into sections (id, checklist_id, title, order_index) values
  ('cccccccc-0003-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 'Hierarchy of Controls', 0),
  ('cccccccc-0003-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', 'Management of Change', 1);

insert into questions (section_id, text, guidance, order_index) values
  ('cccccccc-0003-0000-0000-000000000001', 'Is the hierarchy of controls (eliminate, substitute, engineering, administrative, PPE) applied?', 'Verify implementation across high-risk tasks.', 0),
  ('cccccccc-0003-0000-0000-000000000001', 'Are controls maintained and effectively preventing incidents?', 'Review incident logs and near-misses.', 1),
  ('cccccccc-0003-0000-0000-000000000002', 'Is there a documented process for managing temporary and permanent changes?', 'MOC procedure must be evident.', 0),
  ('cccccccc-0003-0000-0000-000000000002', 'Are OH&S risks assessed before introducing new equipment or processes?', null, 1);

-- 12. Performance Evaluation (33333333-0000-0000-0000-000000000004)
insert into sections (id, checklist_id, title, order_index) values
  ('cccccccc-0004-0000-0000-000000000001', '33333333-0000-0000-0000-000000000004', 'Monitoring & Measurement', 0),
  ('cccccccc-0004-0000-0000-000000000002', '33333333-0000-0000-0000-000000000004', 'Internal Audit & Management Review', 1);

insert into questions (section_id, text, guidance, order_index) values
  ('cccccccc-0004-0000-0000-000000000001', 'Are leading and lagging indicators defined and tracked?', 'Look for KPIs like training hours and incident rates.', 0),
  ('cccccccc-0004-0000-0000-000000000001', 'Is equipment used for monitoring calibrated and verified?', 'Check calibration logs for gas detectors, noise meters, etc.', 1),
  ('cccccccc-0004-0000-0000-000000000002', 'Are internal audits conducted at planned intervals?', 'Review internal audit schedule and reports.', 0),
  ('cccccccc-0004-0000-0000-000000000002', 'Does top management review the OH&S system periodically?', 'Review minutes from management review meetings.', 1);
