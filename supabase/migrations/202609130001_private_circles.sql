-- Apply after supabase/schema.sql. No financial tables are made public.
-- All circle access is through authenticated RPCs with explicit membership checks.
begin;
create table public.dq_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 1 and 32),
 tone text not null default 'sage' check (tone in ('sage','clay','lavender','gold')),
 suspended boolean not null default false
);
create table public.dq_circles (
 id uuid primary key default gen_random_uuid(),
 name text not null check (name in ('Our next chapter','The freedom club','Sunday money dates','Team fresh start')),
 kind text not null check (kind in ('couple','friends')),
 owner_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table public.dq_members (
 circle_id uuid not null references public.dq_circles(id) on delete cascade,
 user_id uuid not null references public.dq_profiles(user_id) on delete cascade,
 joined_at timestamptz not null default now(), primary key(circle_id,user_id)
);
create index dq_members_user on public.dq_members(user_id);
create table public.dq_invites (
 token_hash bytea primary key,
 circle_id uuid not null references public.dq_circles(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '7 days',
 created_at timestamptz not null default now()
);
create table public.dq_events (
 id uuid primary key default gen_random_uuid(),
 circle_id uuid not null references public.dq_circles(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('payment','checkin','joined')),
 source_key text not null,
 progress numeric check(progress between 0 and 100),
 amount numeric check(amount between 0 and 1e12),
 created_at timestamptz not null default now(),
 unique(circle_id,user_id,source_key),
 foreign key(circle_id,user_id) references public.dq_members(circle_id,user_id) on delete cascade
);
create index dq_events_circle_date on public.dq_events(circle_id,created_at desc);
create table public.dq_reactions (
 event_id uuid not null references public.dq_events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 emoji text not null check (emoji in ('clap','heart')),
 primary key(event_id,user_id)
);
create table public.dq_blocks (
 user_id uuid not null references auth.users(id) on delete cascade,
 blocked_user uuid not null references auth.users(id) on delete cascade,
 primary key(user_id,blocked_user), check(user_id<>blocked_user)
);
create table public.dq_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid references auth.users(id) on delete cascade,
 event_id uuid references public.dq_events(id) on delete set null,
 reported_user uuid references auth.users(id) on delete set null,
 category text not null check(category in ('harassment','spam','privacy','other')),
 status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
 created_at timestamptz not null default now(),
 unique(reporter_id,event_id)
);
-- This table is maintained by the operator, never writable by clients.
create table public.dq_name_filters(pattern text primary key);
insert into public.dq_name_filters values ('\m(fuck|shit|asshole|bitch)\M'),('(https?|www)');

alter table public.dq_profiles enable row level security;
alter table public.dq_circles enable row level security;
alter table public.dq_members enable row level security;
alter table public.dq_invites enable row level security;
alter table public.dq_events enable row level security;
alter table public.dq_reactions enable row level security;
alter table public.dq_blocks enable row level security;
alter table public.dq_reports enable row level security;
alter table public.dq_name_filters enable row level security;
revoke all on public.dq_profiles,public.dq_circles,public.dq_members,public.dq_invites,public.dq_events,public.dq_reactions,public.dq_blocks,public.dq_reports,public.dq_name_filters from public,anon,authenticated;
-- No client table policies: only the RPC functions below expose scoped results.

create function public.dq_assert_member(p_circle uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to use circles.'; end if;
 if not exists(select 1 from public.dq_members m join public.dq_profiles p on p.user_id=m.user_id where m.circle_id=p_circle and m.user_id=auth.uid() and not p.suspended) then
  raise exception 'This circle is not available to your account.';
 end if;
end; $$;
create function public.dq_blocked(p_a uuid,p_b uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.dq_blocks b where (b.user_id=p_a and b.blocked_user=p_b) or (b.user_id=p_b and b.blocked_user=p_a));
$$;
create function public.dq_set_name(p_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to use circles.'; end if;
 if p_name is null or char_length(trim(p_name)) not between 1 and 32 or trim(p_name) !~ '^[[:alpha:]][[:alpha:] ''’-]*$' or exists(select 1 from public.dq_name_filters where lower(p_name) ~* pattern) then
  raise exception 'Use a first name with letters, spaces, apostrophes, or hyphens.';
 end if;
 insert into public.dq_profiles(user_id,display_name) values(auth.uid(),trim(p_name)) on conflict(user_id) do update set display_name=excluded.display_name;
 perform 1 from public.dq_profiles where user_id=auth.uid() for update;
 if exists(select 1 from public.dq_profiles where user_id=auth.uid() and suspended) then raise exception 'Your circle access is paused. Contact support.'; end if;
end; $$;
create function public.dq_create_circle(p_name text,p_kind text,p_display_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 perform public.dq_set_name(p_display_name);
 if (select count(*) from public.dq_members where user_id=auth.uid())>=5 then raise exception 'You can belong to up to five circles.'; end if;
 if p_name is null or p_name not in ('Our next chapter','The freedom club','Sunday money dates','Team fresh start') or p_kind is null or p_kind not in ('couple','friends') then raise exception 'Choose a circle name and type.'; end if;
 insert into public.dq_circles(name,kind,owner_id) values(p_name,p_kind,auth.uid()) returning id into new_id;
 insert into public.dq_members(circle_id,user_id) values(new_id,auth.uid());
 return new_id;
end; $$;
create function public.dq_create_invite(p_circle uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare token text; expiry timestamptz;
begin
 perform 1 from public.dq_circles where id=p_circle for update;
 perform public.dq_assert_member(p_circle);
 -- One active invite per member per circle; creating another revokes the old link.
 delete from public.dq_invites where circle_id=p_circle and (created_by=auth.uid() or expires_at<now());
 token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 expiry:=now()+interval '7 days';
 insert into public.dq_invites(token_hash,circle_id,created_by,expires_at) values(sha256(convert_to(token,'UTF8')),p_circle,auth.uid(),expiry);
 return jsonb_build_object('token',token,'expiresAt',expiry);
end; $$;
create function public.dq_revoke_invites(p_circle uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.dq_circles where id=p_circle for update;
 perform public.dq_assert_member(p_circle);
 delete from public.dq_invites where circle_id=p_circle and (created_by=auth.uid() or exists(select 1 from public.dq_circles where id=p_circle and owner_id=auth.uid()));
end; $$;
create function public.dq_join_circle(p_token text,p_display_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare invite public.dq_invites; c public.dq_circles; member_count integer;
begin
 perform public.dq_set_name(p_display_name);
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'That invitation is invalid or expired.'; end if;
 select * into invite from public.dq_invites where token_hash=sha256(convert_to(p_token,'UTF8')) and expires_at>now();
 if not found then raise exception 'That invitation is invalid or expired.'; end if;
 -- Circle lock serializes joins with one another, invite changes, and departures.
 select * into c from public.dq_circles where id=invite.circle_id for update;
 if not found or not exists(select 1 from public.dq_invites where token_hash=invite.token_hash and expires_at>now()) then raise exception 'That invitation is no longer available.'; end if;
 if exists(select 1 from public.dq_members where circle_id=c.id and user_id=auth.uid()) then return c.id; end if;
 if exists(select 1 from public.dq_members where circle_id=c.id and public.dq_blocked(auth.uid(),user_id)) then raise exception 'This circle is not available to your account.'; end if;
 if (select count(*) from public.dq_members where user_id=auth.uid())>=5 then raise exception 'You can belong to up to five circles.'; end if;
 select count(*) into member_count from public.dq_members where circle_id=c.id;
 if member_count >= (case when c.kind='couple' then 2 else 8 end) then raise exception 'This circle is full.'; end if;
 insert into public.dq_members(circle_id,user_id) values(c.id,auth.uid());
 insert into public.dq_events(circle_id,user_id,kind,source_key) values(c.id,auth.uid(),'joined','joined');
 return c.id;
end; $$;
create function public.dq_get_social() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to use circles.'; end if;
 if exists(select 1 from public.dq_profiles where user_id=auth.uid() and suspended) then raise exception 'Your circle access is paused. Contact support.'; end if;
 select jsonb_build_object(
  'viewerId',auth.uid(),
  'circles',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'kind',c.kind,'ownerId',c.owner_id) order by c.created_at) from public.dq_circles c where exists(select 1 from public.dq_members m where m.circle_id=c.id and m.user_id=auth.uid())),'[]'::jsonb),
  'members',coalesce((select jsonb_agg(jsonb_build_object('circleId',m.circle_id,'userId',m.user_id,'name',p.display_name,'tone',p.tone) order by m.joined_at) from public.dq_members m join public.dq_profiles p on p.user_id=m.user_id where not p.suspended and not public.dq_blocked(auth.uid(),m.user_id) and exists(select 1 from public.dq_members own where own.circle_id=m.circle_id and own.user_id=auth.uid())),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'circleId',e.circle_id,'userId',e.user_id,'kind',e.kind,'progress',e.progress,'amount',e.amount,'createdAt',e.created_at,'reactions',coalesce((select jsonb_agg(jsonb_build_object('userId',r.user_id,'emoji',r.emoji)) from public.dq_reactions r join public.dq_profiles p on p.user_id=r.user_id where r.event_id=e.id and not p.suspended and not public.dq_blocked(auth.uid(),r.user_id)),'[]'::jsonb)) order by e.created_at desc) from (select ev.* from public.dq_events ev join public.dq_profiles p on p.user_id=ev.user_id where not p.suspended and not public.dq_blocked(auth.uid(),ev.user_id) and exists(select 1 from public.dq_members m where m.circle_id=ev.circle_id and m.user_id=auth.uid()) and (ev.created_at>=now()-interval '90 days') order by ev.created_at desc limit 500) e),'[]'::jsonb),
  'checkins',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'circleId',e.circle_id,'userId',e.user_id,'kind','checkin','createdAt',e.created_at)) from public.dq_events e join public.dq_profiles p on p.user_id=e.user_id where e.kind='checkin' and e.created_at>now()-interval '14 days' and not p.suspended and not public.dq_blocked(auth.uid(),e.user_id) and exists(select 1 from public.dq_members m where m.circle_id=e.circle_id and m.user_id=auth.uid())),'[]'::jsonb),
  'blocks',coalesce((select jsonb_agg(jsonb_build_object('userId',b.blocked_user,'name',coalesce(p.display_name,'Member'))) from public.dq_blocks b left join public.dq_profiles p on p.user_id=b.blocked_user where b.user_id=auth.uid()),'[]'::jsonb)
 ) into result;
 return result;
end; $$;
create function public.dq_post_win(p_circle uuid,p_kind text,p_payment_id text default null,p_share_amount boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare payload jsonb; payment jsonb; source text; progress_value numeric; amount_value numeric; original numeric; remaining numeric; event_id uuid; today text;
begin
 perform public.dq_assert_member(p_circle);
 perform 1 from public.dq_profiles where user_id=auth.uid() for update;
 if p_kind is null or p_kind not in ('checkin','payment') then raise exception 'Choose a check-in or payment win.'; end if;
 select d.payload into payload from public.debtquest_data d where d.user_id=auth.uid();
 if payload is null then raise exception 'Save your private progress before sharing a win.'; end if;
 if p_kind='checkin' then
  -- The saved local day must be within one day of UTC (all legitimate time zones).
  select value into today from jsonb_array_elements_text(coalesce(payload->'journey'->'checkins','[]'::jsonb)) where value between to_char(current_date-1,'YYYY-MM-DD') and to_char(current_date+1,'YYYY-MM-DD') order by value desc limit 1;
  if today is null then raise exception 'Save today’s check-in before sharing it.'; end if;
  source:='checkin:'||today;
 else
  select value into payment from jsonb_array_elements(coalesce(payload->'payments','[]'::jsonb)) where value->>'id'=p_payment_id limit 1;
  if payment is null or jsonb_typeof(payment->'amountPaid') is distinct from 'number' or (payment->>'amountPaid')::numeric<=0 then raise exception 'This payment is not in your saved tracker.'; end if;
  select coalesce(sum((value->>'originalBalance')::numeric),0),coalesce(sum((value->>'currentBalance')::numeric),0) into original,remaining from jsonb_array_elements(coalesce(payload->'accounts','[]'::jsonb));
  progress_value:=case when original>0 then round(greatest(0,least(100,(original-remaining)/original*100)),1) else 0 end;
  if p_share_amount then amount_value:=(payment->>'amountPaid')::numeric; end if;
  source:='payment:'||p_payment_id;
 end if;
 -- Posting the same source twice is idempotent and never changes prior disclosure.
 select id into event_id from public.dq_events where circle_id=p_circle and user_id=auth.uid() and source_key=source;
 if found then return event_id; end if;
 if (select count(*) from public.dq_events where user_id=auth.uid() and created_at>now()-interval '1 day')>=30 then raise exception 'You’ve shared plenty of good today. Come back tomorrow.'; end if;
 insert into public.dq_events(circle_id,user_id,kind,source_key,progress,amount) values(p_circle,auth.uid(),p_kind,source,progress_value,amount_value) on conflict(circle_id,user_id,source_key) do update set source_key=excluded.source_key returning id into event_id;
 return event_id;
end; $$;
create function public.dq_cheer(p_event uuid,p_emoji text) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.dq_events; current_emoji text;
begin
 select * into ev from public.dq_events where id=p_event for update;
 if not found then raise exception 'This win is no longer available.'; end if;
 perform public.dq_assert_member(ev.circle_id);
 if ev.user_id=auth.uid() or public.dq_blocked(auth.uid(),ev.user_id) or exists(select 1 from public.dq_profiles where user_id=ev.user_id and suspended) then raise exception 'This win is not available for encouragement.'; end if;
 if p_emoji is null or p_emoji not in ('clap','heart') then raise exception 'Choose a cheer or a heart.'; end if;
 select emoji into current_emoji from public.dq_reactions where event_id=p_event and user_id=auth.uid();
 if current_emoji=p_emoji then delete from public.dq_reactions where event_id=p_event and user_id=auth.uid();
 else insert into public.dq_reactions(event_id,user_id,emoji) values(p_event,auth.uid(),p_emoji) on conflict(event_id,user_id) do update set emoji=excluded.emoji; end if;
end; $$;
create function public.dq_block_member(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_user=auth.uid() or not exists(select 1 from public.dq_members a join public.dq_members b on a.circle_id=b.circle_id where a.user_id=auth.uid() and b.user_id=p_user) then raise exception 'This member is not in your circles.'; end if;
 insert into public.dq_blocks(user_id,blocked_user) values(auth.uid(),p_user) on conflict do nothing;
end; $$;
create function public.dq_unblock_member(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to manage your circle.'; end if;
 delete from public.dq_blocks where user_id=auth.uid() and blocked_user=p_user;
end; $$;
create function public.dq_report_event(p_event uuid,p_category text) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.dq_events;
begin
 select * into ev from public.dq_events where id=p_event;
 if not found then raise exception 'This activity is no longer available. Contact support if you need help.'; end if;
 perform public.dq_assert_member(ev.circle_id);
 if ev.user_id=auth.uid() or public.dq_blocked(auth.uid(),ev.user_id) then raise exception 'This activity is not available for reporting.'; end if;
 if p_category is null or p_category not in ('harassment','spam','privacy','other') then raise exception 'Choose a report reason.'; end if;
 if (select count(*) from public.dq_reports where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'Please contact support with additional concerns.'; end if;
 insert into public.dq_reports(reporter_id,event_id,reported_user,category) values(auth.uid(),p_event,ev.user_id,p_category) on conflict(reporter_id,event_id) do nothing;
end; $$;
create function public.dq_clear_activity(p_circle uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.dq_assert_member(p_circle);
 delete from public.dq_events where circle_id=p_circle and user_id=auth.uid();
 delete from public.dq_reactions where user_id=auth.uid() and event_id in (select id from public.dq_events where circle_id=p_circle);
end; $$;
create function public.dq_leave_circle(p_circle uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.dq_circles; successor uuid;
begin
 select * into c from public.dq_circles where id=p_circle for update;
 perform public.dq_assert_member(p_circle);
 if c.owner_id=auth.uid() then
  select user_id into successor from public.dq_members where circle_id=p_circle and user_id<>auth.uid() order by joined_at,user_id limit 1;
  if successor is null then delete from public.dq_circles where id=p_circle; return; end if;
  update public.dq_circles set owner_id=successor where id=p_circle;
 end if;
 delete from public.dq_invites where circle_id=p_circle and created_by=auth.uid();
 perform public.dq_clear_activity(p_circle);
 delete from public.dq_members where circle_id=p_circle and user_id=auth.uid();
end; $$;


alter table public.dq_reports add column member_report boolean not null default false;
create unique index dq_reports_member_once on public.dq_reports(reporter_id,reported_user) where member_report;
create function public.dq_report_member(p_user uuid,p_category text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_user=auth.uid() or public.dq_blocked(auth.uid(),p_user) or not exists(select 1 from public.dq_members a join public.dq_members b on a.circle_id=b.circle_id where a.user_id=auth.uid() and b.user_id=p_user) then raise exception 'This member is not in your circles.'; end if;
 if p_category is null or p_category not in ('harassment','spam','privacy','other') then raise exception 'Choose a report reason.'; end if;
 if (select count(*) from public.dq_reports where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'Please contact support with additional concerns.'; end if;
 insert into public.dq_reports(reporter_id,reported_user,category,member_report) values(auth.uid(),p_user,p_category,true) on conflict(reporter_id,reported_user) where member_report do nothing;
end; $$;
create function public.dq_update_display_name(p_display_name text) returns void
language plpgsql security definer set search_path='' as $$
begin perform public.dq_set_name(p_display_name); end; $$;

-- Function EXECUTE defaults to PUBLIC in PostgreSQL: remove it explicitly.
revoke all on function public.dq_assert_member(uuid),public.dq_blocked(uuid,uuid),public.dq_set_name(text),public.dq_report_member(uuid,text),public.dq_update_display_name(text),public.dq_create_circle(text,text,text),public.dq_create_invite(uuid),public.dq_revoke_invites(uuid),public.dq_join_circle(text,text),public.dq_get_social(),public.dq_post_win(uuid,text,text,boolean),public.dq_cheer(uuid,text),public.dq_block_member(uuid),public.dq_unblock_member(uuid),public.dq_report_event(uuid,text),public.dq_clear_activity(uuid),public.dq_leave_circle(uuid) from public,anon,authenticated;
grant execute on function public.dq_report_member(uuid,text),public.dq_update_display_name(text),public.dq_create_circle(text,text,text),public.dq_create_invite(uuid),public.dq_revoke_invites(uuid),public.dq_join_circle(text,text),public.dq_get_social(),public.dq_post_win(uuid,text,text,boolean),public.dq_cheer(uuid,text),public.dq_block_member(uuid),public.dq_unblock_member(uuid),public.dq_report_event(uuid,text),public.dq_clear_activity(uuid),public.dq_leave_circle(uuid) to authenticated;
commit;
