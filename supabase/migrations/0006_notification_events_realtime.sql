do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notification_events'
  ) then
    alter publication supabase_realtime add table notification_events;
  end if;
end $$;
