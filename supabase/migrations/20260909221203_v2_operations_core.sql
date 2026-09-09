-- Adds the fields and manager settings used by the v2 operations screens.
-- Apply after the initial v2 schema (profiles, videos, video_events and payouts).
alter table public.videos
  add column if not exists source_editor_name text,
  add column if not exists talent_name text,
  add column if not exists priority_label text,
  add column if not exists account_name text,
  add column if not exists source_status text,
  add column if not exists source_row integer,
  add column if not exists source_notes text,
  add column if not exists views_today bigint,
  add column if not exists current_views bigint,
  add column if not exists sales numeric,
  add column if not exists publish_date date;

create index if not exists videos_stage_updated_idx on public.videos(stage, updated_at desc);
create index if not exists videos_source_editor_idx on public.videos(source_editor_name);
create unique index if not exists videos_source_row_unique on public.videos(source_row) where source_row is not null;

create table if not exists public.mis_settings (
  singleton boolean primary key default true check (singleton),
  recipient_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  send_hour smallint not null default 20 check (send_hour between 0 and 23),
  timezone text not null default 'Asia/Kolkata',
  external_summary_note text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.mis_settings enable row level security;
grant select, insert, update on public.mis_settings to authenticated;
create policy "managers read mis settings" on public.mis_settings for select to authenticated using ((select private.is_manager()));
create policy "managers insert mis settings" on public.mis_settings for insert to authenticated with check ((select private.is_manager()));
create policy "managers update mis settings" on public.mis_settings for update to authenticated using ((select private.is_manager())) with check ((select private.is_manager()));
insert into public.mis_settings(singleton) values (true) on conflict (singleton) do nothing;

create or replace function public.record_publish(target_video_id uuid, post_url_input text default null, account_input text default null, action_note text default null)
returns public.videos language plpgsql security definer set search_path = public, private as $$
declare changed public.videos; before_stage public.video_stage;
begin
  if auth.uid() is null or not private.is_manager() then raise exception 'Only managers can record publishing'; end if;
  select stage into before_stage from public.videos where id = target_video_id for update;
  if not found then raise exception 'Video not found'; end if;
  update public.videos set stage='uploaded', published_url=nullif(trim(coalesce(post_url_input,'')), ''), account_name=coalesce(nullif(trim(coalesce(account_input,'')), ''), account_name), uploaded_at=coalesce(uploaded_at, now()), updated_at=now() where id=target_video_id returning * into changed;
  insert into public.video_events(video_id, actor_id, event_type, previous_stage, next_stage, note) values(target_video_id, auth.uid(), 'published', before_stage, 'uploaded', nullif(trim(coalesce(action_note,'')), ''));
  return changed;
end; $$;
revoke all on function public.record_publish(uuid,text,text,text) from public, anon;
grant execute on function public.record_publish(uuid,text,text,text) to authenticated;
