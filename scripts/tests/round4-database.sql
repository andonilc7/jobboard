-- Run after all migrations in an isolated database. Rolls back every fixture.
\set ON_ERROR_STOP on
begin;
insert into auth.users (id, raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001', '{"role":"recruiter","full_name":"Test Recruiter","company_name":"Round4 Fixture Company"}'),
('10000000-0000-4000-8000-000000000002', '{"role":"seeker","full_name":"Test Seeker"}'),
('10000000-0000-4000-8000-000000000003', '{"role":"recruiter","full_name":"Other Recruiter","company_name":"Round4 Other Company"}');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;
insert into public.jobs (title, description, city, state, location, pay_min, pay_max, experience_level, min_yoe, max_yoe, questions)
values ('Test Engineer', 'Test role description', 'Austin', 'TX', 'incorrect display', 90000, 120000, 'mid', 2, 5,
 '[{"id":"30000000-0000-4000-8000-000000000001","prompt":"Why this role?","required":true},{"id":"30000000-0000-4000-8000-000000000002","prompt":"Anything else?","required":false}]') returning id \gset
select set_config('round4.job', :'id', true);
do $$ begin
  if (select location from public.jobs where id=current_setting('round4.job')::uuid) <> 'Austin, TX' then raise exception 'Canonical location failed'; end if;
  begin update public.jobs set state='XX' where id=current_setting('round4.job')::uuid; raise exception 'Invalid state accepted';
  exception when check_violation then null; end;
  begin update public.jobs set min_yoe=9, max_yoe=2 where id=current_setting('round4.job')::uuid; raise exception 'Inverted YOE accepted';
  exception when check_violation then null; end;
  begin update public.jobs set questions='[{"id":"bad","prompt":"Why?","required":true}]' where id=current_setting('round4.job')::uuid;
    raise exception 'Invalid question accepted';
  exception when raise_exception then if sqlerrm='Invalid question accepted' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
set local role authenticated;
update public.seeker_profiles set city='Indianapolis',state='IN', resume_path='10000000-0000-4000-8000-000000000002/test.pdf'
where user_id='10000000-0000-4000-8000-000000000002';
do $$ begin
  if (select location from public.seeker_profiles where user_id=auth.uid()) <> 'Indianapolis, IN' then raise exception 'Profile location failed'; end if;
  begin
    insert into public.applications (job_id,seeker_id) values (current_setting('round4.job')::uuid,auth.uid());
    raise exception 'Missing answers accepted';
  exception when raise_exception then if sqlerrm='Missing answers accepted' then raise; end if; end;
  begin
    insert into public.applications (job_id,seeker_id,answers) values (current_setting('round4.job')::uuid,auth.uid(),
      '[{"id":"30000000-0000-4000-8000-000000000001","prompt":"Why this role?","required":true,"answer":"\t\n"},{"id":"30000000-0000-4000-8000-000000000002","prompt":"Anything else?","required":false,"answer":""}]');
    raise exception 'Blank required answer accepted';
  exception when raise_exception then if sqlerrm='Blank required answer accepted' then raise; end if; end;
  begin
    insert into public.applications (job_id,seeker_id,answers) values (current_setting('round4.job')::uuid,auth.uid(),
      '[{"id":"30000000-0000-4000-8000-000000000001","prompt":"Outdated prompt","required":true,"answer":"Test"},{"id":"30000000-0000-4000-8000-000000000002","prompt":"Anything else?","required":false,"answer":""}]');
    raise exception 'Stale prompt accepted';
  exception when raise_exception then if sqlerrm='Stale prompt accepted' then raise; end if; end;
end $$;
insert into public.applications (job_id,seeker_id,answers) values (current_setting('round4.job')::uuid,auth.uid(),
 '[{"id":"30000000-0000-4000-8000-000000000001","prompt":"Why this role?","required":true,"answer":"  I enjoy the work.  "},{"id":"30000000-0000-4000-8000-000000000002","prompt":"Anything else?","required":false,"answer":""}]');
do $$ begin
  if (select answers->0->>'answer' from public.applications where seeker_id=auth.uid()) <> 'I enjoy the work.' then raise exception 'Answer snapshot failed'; end if;
  if (select resume_path from public.applications where seeker_id=auth.uid()) <> '10000000-0000-4000-8000-000000000002/test.pdf' then raise exception 'Resume snapshot failed'; end if;
  begin update public.applications set answers='[]'; raise exception 'Answers were mutable';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.applications where job_id=current_setting('round4.job')::uuid) <> 0 then raise exception 'Other company saw applicant answers'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;
update public.jobs set questions='[]' where id=current_setting('round4.job')::uuid;
do $$ begin
  if (select answers->0->>'prompt' from public.applications where job_id=current_setting('round4.job')::uuid) <> 'Why this role?' then raise exception 'Editing posting changed historical response'; end if;
end $$;
update public.applications set status='reviewing' where job_id=current_setting('round4.job')::uuid;
do $$ begin
  if (select count(*) from public.application_events) <> 2 then raise exception 'Timeline behavior changed'; end if;
end $$;
rollback;
\echo 'Round 4 database validation passed.'
