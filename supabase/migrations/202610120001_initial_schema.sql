create extension if not exists pgcrypto;

create type public.workflow_status as enum ('idea','researching','research_review','drafting','script_review','approved','archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  editorial_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  category text not null default 'Aviação geral',
  audience text not null default 'Curiosos por aviação',
  format text not null default 'Reels' check (format in ('Reels','Carrossel')),
  workflow_status public.workflow_status not null default 'idea',
  research_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.research_topics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.content_projects(id) on delete cascade,
  query text not null check (char_length(query) between 4 and 180),
  category text not null,
  audience text not null,
  format text not null check (format in ('Reels','Carrossel')),
  period text not null,
  created_at timestamptz not null default now()
);

create table public.research_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_projects(id) on delete cascade,
  title text not null,
  url text not null check (url ~ '^https?://'),
  published_at timestamptz,
  accessed_at timestamptz not null default now(),
  evidence text not null default '',
  created_at timestamptz not null default now(),
  unique (project_id, url)
);

create table public.script_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_projects(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  content jsonb not null,
  change_note text not null default '',
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

create table public.project_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_projects(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null check (char_length(content) <= 8000),
  created_at timestamptz not null default now()
);

create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_projects(id) on delete cascade,
  from_status public.workflow_status,
  to_status public.workflow_status not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index content_projects_owner_updated_idx on public.content_projects(owner_id, updated_at desc);
create index content_projects_status_idx on public.content_projects(owner_id, workflow_status);
create index research_topics_owner_created_idx on public.research_topics(owner_id, created_at desc);
create index research_sources_project_idx on public.research_sources(project_id, accessed_at desc);
create index script_versions_project_version_idx on public.script_versions(project_id, version_number desc);
create index project_messages_project_created_idx on public.project_messages(project_id, created_at desc);
create index workflow_events_project_created_idx on public.workflow_events(project_id, created_at desc);

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger content_projects_updated_at before update on public.content_projects for each row execute function public.set_updated_at();

create function public.guard_project_transition() returns trigger language plpgsql as $$
begin
  if new.workflow_status = old.workflow_status then return new; end if;
  if not (
    (old.workflow_status = 'idea' and new.workflow_status in ('researching','archived')) or
    (old.workflow_status = 'researching' and new.workflow_status in ('research_review','idea','archived')) or
    (old.workflow_status = 'research_review' and new.workflow_status in ('drafting','researching','archived')) or
    (old.workflow_status = 'drafting' and new.workflow_status in ('script_review','research_review','archived')) or
    (old.workflow_status = 'script_review' and new.workflow_status in ('drafting','approved','archived')) or
    (old.workflow_status = 'approved' and new.workflow_status in ('drafting','archived')) or
    (old.workflow_status = 'archived' and new.workflow_status = 'idea')
  ) then raise exception 'invalid project workflow transition: % -> %', old.workflow_status, new.workflow_status; end if;
  return new;
end; $$;
create trigger content_projects_guard_transition before update of workflow_status on public.content_projects for each row execute function public.guard_project_transition();

create function public.keep_approved_versions_immutable() returns trigger language plpgsql as $$
begin
  if old.is_approved and (new.content is distinct from old.content or new.project_id is distinct from old.project_id or new.version_number is distinct from old.version_number) then
    raise exception 'approved script versions are immutable';
  end if;
  return new;
end; $$;
create trigger script_versions_immutable before update on public.script_versions for each row execute function public.keep_approved_versions_immutable();

create function public.create_profile_for_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'name','')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.content_projects enable row level security;
alter table public.research_topics enable row level security;
alter table public.research_sources enable row level security;
alter table public.script_versions enable row level security;
alter table public.project_messages enable row level security;
alter table public.workflow_events enable row level security;

create policy "profiles are owner-only" on public.profiles for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "projects are owner-only" on public.content_projects for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "topics are owner-only" on public.research_topics for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "sources are owner-only" on public.research_sources for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "versions are owner-only" on public.script_versions for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "messages are owner-only" on public.project_messages for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "events are owner-only" on public.workflow_events for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
