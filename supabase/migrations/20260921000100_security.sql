create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('ADMIN', 'JUDGE', 'TEAM')),
  team_id uuid references public.teams(id) on delete set null,
  judge_id uuid references public.judges(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint user_profiles_role_owner_check check (
    (role = 'ADMIN' and team_id is null and judge_id is null)
    or (role = 'JUDGE' and team_id is null and judge_id is not null)
    or (role = 'TEAM' and team_id is not null and judge_id is null)
  )
);

alter table public.evaluations add column if not exists is_locked boolean not null default false;
alter table public.evaluations add column if not exists confirmed_at timestamptz;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where user_id = auth.uid();
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.user_profiles where user_id = auth.uid();
$$;

create or replace function public.current_user_judge_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select judge_id from public.user_profiles where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'ADMIN';
$$;

create or replace function public.is_assigned_judge(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.judge_assignments
    where judge_id = public.current_user_judge_id()
      and team_id = target_team_id
  );
$$;

create or replace function public.enforce_problem_statement_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_allowed integer;
  current_count integer;
begin
  if new.problem_statement_id is null
     or new.problem_statement_id = old.problem_statement_id then
    return new;
  end if;

  select max_teams into max_allowed
  from public.problem_statements
  where id = new.problem_statement_id
  for update;

  if max_allowed is null then
    raise exception 'Problem statement does not exist';
  end if;

  select count(*) into current_count
  from public.teams
  where problem_statement_id = new.problem_statement_id
    and id <> new.id;

  if current_count >= max_allowed then
    raise exception 'Problem statement capacity has been reached';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_team_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'TEAM' then
    return new;
  end if;

  if old.problem_statement_id is not null
     and old.status = 'PS_SELECTED'
     and new.problem_statement_id is distinct from old.problem_statement_id then
    raise exception 'A selected problem statement cannot be changed by a team';
  end if;

  if new.id is distinct from old.id
     or new.team_code is distinct from old.team_code
     or new.name is distinct from old.name
     or new.college is distinct from old.college
     or new.leader_name is distinct from old.leader_name
     or new.leader_email is distinct from old.leader_email
     or new.member_count is distinct from old.member_count
     or new.theme is distinct from old.theme
     or new.score is distinct from old.score
     or new.created_at is distinct from old.created_at then
    raise exception 'Team profile fields are managed by administrators';
  end if;

  if new.problem_statement_id is not distinct from old.problem_statement_id
     and new.status is distinct from old.status then
    raise exception 'This team status cannot be changed directly';
  end if;

  if new.problem_statement_id is distinct from old.problem_statement_id
     and new.status is distinct from 'PS_SELECTED' then
    raise exception 'Problem statement selection must use the PS_SELECTED status';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_evaluation_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if public.current_user_role() is distinct from 'JUDGE' then
    raise exception 'Only administrators or judges may update evaluations';
  end if;

  if new.judge_id is distinct from old.judge_id
     or new.team_id is distinct from old.team_id then
    raise exception 'Evaluation ownership cannot be changed';
  end if;

  if old.is_locked then
    raise exception 'A locked evaluation cannot be modified by its judge';
  end if;

  if new.is_locked then
    new.confirmed_at := clock_timestamp();
  elsif new.confirmed_at is distinct from old.confirmed_at then
    raise exception 'confirmed_at can only be set when locking an evaluation';
  end if;

  return new;
end;
$$;

drop trigger if exists teams_problem_statement_capacity on public.teams;
create trigger teams_problem_statement_capacity
before update of problem_statement_id on public.teams
for each row execute function public.enforce_problem_statement_capacity();

drop trigger if exists teams_update_scope on public.teams;
create trigger teams_update_scope
before update on public.teams
for each row execute function public.enforce_team_update_scope();

drop trigger if exists evaluations_update_scope on public.evaluations;
create trigger evaluations_update_scope
before update on public.evaluations
for each row execute function public.enforce_evaluation_update_scope();

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'user_profiles', 'teams', 'team_members', 'problem_statements',
        'judges', 'judge_assignments', 'submissions', 'evaluations', 'announcements'
      ])
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$$;

alter table public.user_profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.problem_statements enable row level security;
alter table public.judges enable row level security;
alter table public.judge_assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.evaluations enable row level security;
alter table public.announcements enable row level security;

revoke all on public.user_profiles, public.teams, public.team_members,
  public.problem_statements, public.judges, public.judge_assignments,
  public.submissions, public.evaluations, public.announcements from anon;
grant select, insert, update, delete on public.user_profiles, public.teams,
  public.team_members, public.problem_statements, public.judges,
  public.judge_assignments, public.submissions, public.evaluations,
  public.announcements to authenticated;

create policy user_profiles_select on public.user_profiles for select to authenticated
using (user_id = auth.uid() or public.is_admin());
create policy user_profiles_admin on public.user_profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy teams_select on public.teams for select to authenticated
using (
  public.is_admin()
  or id = public.current_user_team_id()
  or public.is_assigned_judge(id)
);

create policy teams_update on public.teams for update to authenticated
using (public.is_admin() or id = public.current_user_team_id())
with check (public.is_admin() or id = public.current_user_team_id());

create policy team_members_select on public.team_members for select to authenticated
using (public.is_admin() or team_id = public.current_user_team_id());

create policy problem_statements_select on public.problem_statements for select to authenticated
using (true);
create policy problem_statements_admin on public.problem_statements for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy judges_select on public.judges for select to authenticated
using (public.is_admin() or id = public.current_user_judge_id());
create policy judges_admin on public.judges for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy judge_assignments_select on public.judge_assignments for select to authenticated
using (public.is_admin() or judge_id = public.current_user_judge_id());
create policy judge_assignments_admin on public.judge_assignments for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy submissions_select on public.submissions for select to authenticated
using (
  public.is_admin()
  or team_id = public.current_user_team_id()
  or public.is_assigned_judge(team_id)
);
create policy submissions_team_insert on public.submissions for insert to authenticated
with check (team_id = public.current_user_team_id());
create policy submissions_team_update on public.submissions for update to authenticated
using (public.is_admin() or team_id = public.current_user_team_id())
with check (public.is_admin() or team_id = public.current_user_team_id());
create policy submissions_admin_delete on public.submissions for delete to authenticated
using (public.is_admin());

create policy evaluations_select on public.evaluations for select to authenticated
using (
  public.is_admin()
  or (judge_id = public.current_user_judge_id() and public.is_assigned_judge(team_id))
  or team_id = public.current_user_team_id()
);
create policy evaluations_judge_insert on public.evaluations for insert to authenticated
with check (
  public.is_admin()
  or (judge_id = public.current_user_judge_id() and public.is_assigned_judge(team_id) and is_locked = false)
);
create policy evaluations_update on public.evaluations for update to authenticated
using (
  public.is_admin()
  or (judge_id = public.current_user_judge_id() and public.is_assigned_judge(team_id) and is_locked = false)
)
with check (
  public.is_admin()
  or (judge_id = public.current_user_judge_id() and public.is_assigned_judge(team_id)
  )
);
create policy evaluations_admin_delete on public.evaluations for delete to authenticated
using (public.is_admin());

create policy announcements_select on public.announcements for select to authenticated
using (public.is_admin() or is_published = true);
create policy announcements_admin on public.announcements for all to authenticated
using (public.is_admin()) with check (public.is_admin());

revoke execute on function public.current_user_role() from public;
revoke execute on function public.current_user_team_id() from public;
revoke execute on function public.current_user_judge_id() from public;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_assigned_judge(uuid) from public;
revoke execute on function public.enforce_problem_statement_capacity() from public;
revoke execute on function public.enforce_team_update_scope() from public;
revoke execute on function public.enforce_evaluation_update_scope() from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_team_id() to authenticated;
grant execute on function public.current_user_judge_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_assigned_judge(uuid) to authenticated;
