-- HW6 Round 4: retain the existing Supabase architecture while adding target functionality.
alter table public.jobs
  add column city text,
  add column state text,
  add column min_yoe numeric,
  add column max_yoe numeric,
  add column questions jsonb not null default '[]';
alter table public.seeker_profiles add column city text, add column state text;
alter table public.applications add column answers jsonb not null default '[]';

create function public.valid_us_state(value text) returns boolean
language sql immutable set search_path = '' as $$
  select value = any(array['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']);
$$;

-- Backfill only recognizable city/state locations; preserve legacy and remote labels.
update public.jobs set city = trim(split_part(location, ',', 1)), state = trim(split_part(location, ',', 2))
where location ~ '^[^,]+, [A-Z]{2}$' and public.valid_us_state(trim(split_part(location, ',', 2)));
update public.seeker_profiles set city = trim(split_part(location, ',', 1)), state = trim(split_part(location, ',', 2))
where location ~ '^[^,]+, [A-Z]{2}$' and public.valid_us_state(trim(split_part(location, ',', 2)));

alter table public.jobs add constraint jobs_numeric_experience check (
  (min_yoe is null or min_yoe between 0 and 60) and
  (max_yoe is null or max_yoe between 0 and 60) and
  (min_yoe is null or max_yoe is null or min_yoe <= max_yoe)
);
create function public.valid_city_state(city text, state text) returns boolean
language sql immutable set search_path = '' as $$
  select (city is null and state is null) or
    (city is not null and state is not null and length(city) between 2 and 80
     and city ~ '^[[:alpha:]][[:alpha:] .''-]*$' and public.valid_us_state(state));
$$;
alter table public.jobs add constraint jobs_city_state check (public.valid_city_state(city, state));
alter table public.seeker_profiles add constraint seeker_city_state check (public.valid_city_state(city, state));

-- Canonical display strings retain compatibility with existing cards and matching logic.
create function public.normalize_structured_location() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.city is not null then new.city := trim(new.city); end if;
  if new.state is not null then new.state := upper(trim(new.state)); end if;
  if new.city is not null and new.state is not null then
    new.location := new.city || ', ' || new.state;
  end if;
  if tg_table_name = 'jobs' then
    if new.city is null and new.state is null then
      if tg_op = 'INSERT' then
        if not new.is_remote then raise exception 'Enter city and state for an on-site posting'; end if;
        if new.location is null or new.location !~ '^Remote' then new.location := 'Remote'; end if;
      elsif new.city is distinct from old.city or new.state is distinct from old.state or (old.is_remote and not new.is_remote) then
        if not new.is_remote then raise exception 'Enter city and state for an on-site posting'; end if;
        if new.location is null or new.location !~ '^Remote' then new.location := 'Remote'; end if;
      end if;
    end if;
  elsif tg_table_name = 'seeker_profiles' then
    if tg_op = 'UPDATE' and new.city is null and new.state is null then
      if new.city is distinct from old.city or new.state is distinct from old.state then new.location := null; end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger jobs_normalize_location before insert or update on public.jobs
for each row execute function public.normalize_structured_location();
create trigger seeker_normalize_location before insert or update on public.seeker_profiles
for each row execute function public.normalize_structured_location();

create function public.validate_job_questions() returns trigger
language plpgsql set search_path = '' as $$
declare q jsonb; seen text[] := '{}';
begin
  if jsonb_typeof(new.questions) <> 'array' then raise exception 'Questions must be an array'; end if;
  if jsonb_array_length(new.questions) > 10 then raise exception 'Up to 10 questions'; end if;
  for q in select value from jsonb_array_elements(new.questions) loop
    if jsonb_typeof(q) <> 'object' or jsonb_typeof(q->'id') is distinct from 'string'
      or (q->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(q->'prompt') is distinct from 'string'
      or length(btrim(q->>'prompt', E' \t\n\r\f')) not between 1 and 500
      or jsonb_typeof(q->'required') is distinct from 'boolean'
      or (q->>'id') = any(seen)
    then raise exception 'Invalid question or duplicate question ID'; end if;
    seen := array_append(seen, q->>'id');
  end loop;
  return new;
end;
$$;
create trigger jobs_validate_questions before insert or update of questions on public.jobs
for each row execute function public.validate_job_questions();

-- Validate current questions and construct the immutable prompt/answer snapshot in the database.
create function public.validate_application_answers() returns trigger
language plpgsql security definer set search_path = '' as $$
declare questions jsonb; q jsonb; a jsonb; snapshot jsonb := '[]'; answer_count integer;
begin
  select j.questions into questions from public.jobs j where j.id = new.job_id for share;
  if not found then raise exception 'Posting not found'; end if;
  if jsonb_typeof(new.answers) <> 'array' then raise exception 'Answers must be an array'; end if;
  if jsonb_array_length(new.answers) <> jsonb_array_length(questions) then
    raise exception 'Application questions changed. Reload the posting and answer its current questions.';
  end if;
  for q in select value from jsonb_array_elements(questions) loop
    select count(*) into answer_count from jsonb_array_elements(new.answers) x where x->>'id' = q->>'id';
    if answer_count <> 1 then raise exception 'Answer each question exactly once'; end if;
    select value into a from jsonb_array_elements(new.answers) where value->>'id' = q->>'id';
    if a->'prompt' is distinct from q->'prompt' or a->'required' is distinct from q->'required' then
      raise exception 'Application questions changed. Reload the posting before applying.';
    end if;
    if jsonb_typeof(a->'answer') is distinct from 'string' or length(a->>'answer') > 2000 then
      raise exception 'Answers must be text of at most 2,000 characters';
    end if;
    if (q->>'required')::boolean and btrim(a->>'answer', E' \t\n\r\f') = '' then raise exception 'Answer all required questions'; end if;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object(
      'id', q->>'id', 'prompt', q->>'prompt', 'required', (q->>'required')::boolean, 'answer', btrim(a->>'answer', E' \t\n\r\f')));
  end loop;
  new.answers := snapshot;
  return new;
end;
$$;
create trigger applications_validate_answers before insert on public.applications
for each row execute function public.validate_application_answers();

-- Existing policies continue to enforce company ownership and seeker identity.
grant insert (city, state, min_yoe, max_yoe, questions) on public.jobs to authenticated;
grant update (city, state, min_yoe, max_yoe, questions) on public.jobs to authenticated;
grant insert (answers) on public.applications to authenticated;
-- Applications remain status-only for updates: submitted answers cannot be edited.

-- Explicit privileges support projects created with automatic table exposure disabled.
-- Keep earlier column-level restrictions for jobs, profiles and applications intact.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.companies, public.jobs to anon;
grant select on public.profiles, public.companies, public.recruiters, public.seeker_profiles,
  public.experiences, public.jobs, public.applications, public.application_events to authenticated;
grant update on public.companies, public.seeker_profiles to authenticated;
grant insert, update, delete on public.experiences to authenticated;
grant delete on public.jobs to authenticated;
grant all on public.profiles, public.companies, public.recruiters, public.seeker_profiles,
  public.experiences, public.jobs, public.applications, public.application_events to service_role;
grant execute on function public.my_company_id(), public.is_company_recruiter(uuid),
  public.can_view_seeker(uuid), public.can_view_application(uuid), public.has_applied_to_job(uuid),
  public.valid_us_state(text), public.valid_city_state(text, text) to anon, authenticated, service_role;
