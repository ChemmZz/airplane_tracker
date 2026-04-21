create table if not exists user_live_regions (
  clerk_user_id text primary key,
  region_id uuid not null references regions(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index if not exists user_live_regions_region_idx on user_live_regions (region_id);

alter table user_live_regions enable row level security;

drop policy if exists "user_live_regions_owner_select" on user_live_regions;
create policy "user_live_regions_owner_select" on user_live_regions
  for select using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "user_live_regions_owner_insert" on user_live_regions;
create policy "user_live_regions_owner_insert" on user_live_regions
  for insert with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "user_live_regions_owner_update" on user_live_regions;
create policy "user_live_regions_owner_update" on user_live_regions
  for update using (auth.jwt() ->> 'sub' = clerk_user_id)
  with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "user_live_regions_owner_delete" on user_live_regions;
create policy "user_live_regions_owner_delete" on user_live_regions
  for delete using (auth.jwt() ->> 'sub' = clerk_user_id);

create or replace function enforce_live_region_is_favorited()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from user_favorites
    where clerk_user_id = new.clerk_user_id
      and region_id = new.region_id
  ) then
    raise exception 'Live region must be one of your favorited regions.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_live_regions_require_favorite on user_live_regions;
create trigger user_live_regions_require_favorite
before insert or update on user_live_regions
for each row
execute function enforce_live_region_is_favorited();

create or replace function sync_live_region_after_favorite_delete()
returns trigger
language plpgsql
as $$
declare
  replacement_region_id uuid;
begin
  if exists (
    select 1
    from user_live_regions
    where clerk_user_id = old.clerk_user_id
      and region_id = old.region_id
  ) then
    select region_id
    into replacement_region_id
    from user_favorites
    where clerk_user_id = old.clerk_user_id
      and region_id <> old.region_id
    order by created_at asc
    limit 1;

    if replacement_region_id is null then
      delete from user_live_regions
      where clerk_user_id = old.clerk_user_id;
    else
      update user_live_regions
      set region_id = replacement_region_id,
          updated_at = now()
      where clerk_user_id = old.clerk_user_id;
    end if;
  end if;

  return old;
end;
$$;

drop trigger if exists user_favorites_sync_live_region on user_favorites;
create trigger user_favorites_sync_live_region
after delete on user_favorites
for each row
execute function sync_live_region_after_favorite_delete();

insert into user_live_regions (clerk_user_id, region_id)
select distinct on (clerk_user_id) clerk_user_id, region_id
from user_favorites
order by clerk_user_id, created_at asc
on conflict (clerk_user_id) do nothing;
