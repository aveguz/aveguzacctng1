alter table public.activity_attempts
  add column if not exists last_name text,
  add column if not exists first_name text,
  add column if not exists middle_name text;

update public.activity_attempts as attempt
set
  last_name = profile.last_name,
  first_name = profile.first_name,
  middle_name = profile.middle_initial
from public.profiles as profile
where profile.id = attempt.user_id
  and (
    attempt.last_name is null
    or attempt.first_name is null
    or attempt.middle_name is null
  );