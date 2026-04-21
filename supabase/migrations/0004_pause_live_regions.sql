alter table user_live_regions
add column if not exists is_paused boolean not null default false;

create index if not exists user_live_regions_active_region_idx
on user_live_regions (region_id)
where is_paused = false;
