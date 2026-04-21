create or replace function enforce_user_favorites_limit()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from user_favorites
    where clerk_user_id = new.clerk_user_id
  ) >= 3 then
    raise exception 'You can only favorite 3 regions at a time.';
  end if;

  return new;
end;
$$;

drop trigger if exists user_favorites_limit_insert on user_favorites;
create trigger user_favorites_limit_insert
before insert on user_favorites
for each row
execute function enforce_user_favorites_limit();
