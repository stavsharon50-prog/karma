-- KARMA. MVP database schema (Supabase / Postgres)
-- Run once in Supabase: SQL Editor → New query → paste → Run.
--
-- Privacy model in one paragraph:
--   * You can only add a beef about an accepted friend.
--   * The person a beef is about never reads the beefs table directly. They go through
--     beefs_for_me(), which hides who created it until a reveal is mutually accepted.
--   * Every state change (settle, forgive, release, reveal, report) goes through a
--     security-definer function that checks who is allowed to do it.

create extension if not exists pgcrypto;

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 30),
  pronoun       text not null default 'f' check (pronoun in ('f', 'm', 'pl')),
  color         text not null default 'pink' check (color in ('pink', 'lime', 'spicy', 'surface')),
  age_confirmed boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ───────────────────────── friendships ─────────────────────────
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  user_low     uuid not null references public.profiles (id) on delete cascade,
  user_high    uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  check (user_low < user_high),
  unique (user_low, user_high)
);

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where user_low = least(a, b) and user_high = greatest(a, b) and status = 'accepted'
  );
$$;

-- ───────────────────────── invites (WhatsApp links) ─────────────────────────
create table if not exists public.invites (
  token      text primary key default encode(gen_random_bytes(8), 'hex'),
  inviter    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ───────────────────────── beefs ─────────────────────────
create table if not exists public.beefs (
  id          uuid primary key default gen_random_uuid(),
  creator     uuid not null references public.profiles (id) on delete cascade,
  target      uuid not null references public.profiles (id) on delete cascade,
  kind        text not null default 'beef' check (kind in ('beef', 'debt', 'promise', 'oops')),
  reason      text not null check (char_length(reason) between 2 and 60),
  spice       smallint not null default 2 check (spice between 1 and 3),
  anonymous   boolean not null default true,
  revealed    boolean not null default false,
  status      text not null default 'pending'
              check (status in ('pending', 'in_progress', 'settled', 'forgiven', 'released', 'removed')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  check (creator <> target)
);
create index if not exists beefs_target_idx on public.beefs (target, status);
create index if not exists beefs_creator_idx on public.beefs (creator, status);

-- Users who asked not to receive beefs from a given person (set from a report).
create table if not exists public.blocks (
  blocker    uuid not null references public.profiles (id) on delete cascade,
  blocked    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

-- Guard rails on insert: friends only, not blocked, max 3 open beefs per pair.
create or replace function public.beef_insert_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.creator <> auth.uid() then raise exception 'not allowed'; end if;
  if not are_friends(new.creator, new.target) then raise exception 'not_friends'; end if;
  if exists (select 1 from blocks where blocker = new.target and blocked = new.creator) then
    raise exception 'blocked';
  end if;
  if (select count(*) from beefs where creator = new.creator and target = new.target
      and status in ('pending', 'in_progress')) >= 3 then
    raise exception 'too_many_open';
  end if;
  new.status := 'pending'; new.revealed := false; new.closed_at := null;
  return new;
end $$;
drop trigger if exists beef_insert_guard on public.beefs;
create trigger beef_insert_guard before insert on public.beefs
  for each row execute function public.beef_insert_guard();

-- ───────────────────────── offers (settlements) ─────────────────────────
create table if not exists public.offers (
  id         uuid primary key default gen_random_uuid(),
  beef_id    uuid not null references public.beefs (id) on delete cascade,
  from_user  uuid not null references public.profiles (id) on delete cascade,
  offer_type text not null check (offer_type in ('coffee', 'apology', 'story', 'song', 'next_time', 'custom')),
  message    text check (char_length(message) <= 120),
  status     text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── reveal requests, reports, events ─────────────────────────
create table if not exists public.reveal_requests (
  id         uuid primary key default gen_random_uuid(),
  beef_id    uuid not null references public.beefs (id) on delete cascade,
  status     text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (beef_id)
);

create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  beef_id    uuid not null references public.beefs (id) on delete cascade,
  reporter   uuid not null references public.profiles (id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profiles (id) on delete set null,
  name       text not null check (char_length(name) <= 60),
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ───────────────────────── row level security ─────────────────────────
alter table public.profiles        enable row level security;
alter table public.friendships     enable row level security;
alter table public.invites         enable row level security;
alter table public.beefs           enable row level security;
alter table public.blocks          enable row level security;
alter table public.offers          enable row level security;
alter table public.reveal_requests enable row level security;
alter table public.reports         enable row level security;
alter table public.events          enable row level security;

drop policy if exists "profiles: self or friends" on public.profiles;
create policy "profiles: self or friends" on public.profiles for select
  using (id = auth.uid() or are_friends(id, auth.uid())
         or exists (select 1 from friendships f where f.status = 'pending'
                    and auth.uid() in (f.user_low, f.user_high) and id in (f.user_low, f.user_high)));
drop policy if exists "profiles: insert self" on public.profiles;
create policy "profiles: insert self" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles: update self" on public.profiles;
create policy "profiles: update self" on public.profiles for update using (id = auth.uid());

drop policy if exists "friendships: members read" on public.friendships;
create policy "friendships: members read" on public.friendships for select
  using (auth.uid() in (user_low, user_high));

drop policy if exists "invites: own" on public.invites;
create policy "invites: own" on public.invites for all using (inviter = auth.uid()) with check (inviter = auth.uid());

-- Creators read and insert their own beefs. Targets use beefs_for_me().
drop policy if exists "beefs: creator reads" on public.beefs;
create policy "beefs: creator reads" on public.beefs for select using (creator = auth.uid());
drop policy if exists "beefs: creator inserts" on public.beefs;
create policy "beefs: creator inserts" on public.beefs for insert with check (creator = auth.uid());

drop policy if exists "offers: participants read" on public.offers;
create policy "offers: participants read" on public.offers for select
  using (exists (select 1 from beefs b where b.id = beef_id and auth.uid() in (b.creator, b.target)));

drop policy if exists "events: insert own" on public.events;
create policy "events: insert own" on public.events for insert with check (user_id = auth.uid());

-- ───────────────────────── functions the app calls ─────────────────────────

-- Profile bootstrap after Google sign-in.
create or replace function public.upsert_profile(p_name text, p_pronoun text, p_color text, p_age boolean)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare r profiles;
begin
  if not p_age then raise exception 'age_required'; end if;
  insert into profiles (id, display_name, pronoun, color, age_confirmed)
  values (auth.uid(), p_name, p_pronoun, p_color, true)
  on conflict (id) do update set display_name = excluded.display_name, pronoun = excluded.pronoun,
    color = excluded.color, age_confirmed = true
  returning * into r;
  return r;
end $$;

-- Create (or reuse) my invite link token.
create or replace function public.my_invite()
returns text language plpgsql security definer set search_path = public as $$
declare t text;
begin
  select token into t from invites where inviter = auth.uid() order by created_at desc limit 1;
  if t is null then
    insert into invites (inviter) values (auth.uid()) returning token into t;
  end if;
  return t;
end $$;

-- Public info shown on the invite landing page (inviter first name only).
create or replace function public.invite_info(p_token text)
returns table (inviter uuid, display_name text, color text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.color from invites i join profiles p on p.id = i.inviter where i.token = p_token;
$$;
grant execute on function public.invite_info(text) to anon, authenticated;

-- Accepting an invite link = both sides consented, so the friendship is accepted.
create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv uuid;
begin
  select inviter into inv from invites where token = p_token;
  if inv is null then raise exception 'invalid_invite'; end if;
  if inv = auth.uid() then return inv; end if;
  insert into friendships (user_low, user_high, requested_by, status)
  values (least(inv, auth.uid()), greatest(inv, auth.uid()), inv, 'accepted')
  on conflict (user_low, user_high) do update set status = 'accepted';
  return inv;
end $$;

create or replace function public.respond_friend(p_friendship uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update friendships set status = case when p_accept then 'accepted' else 'declined' end
  where id = p_friendship and auth.uid() in (user_low, user_high) and requested_by <> auth.uid();
end $$;

-- My accepted friends.
create or replace function public.my_friends()
returns table (id uuid, display_name text, color text, pronoun text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.color, p.pronoun
  from friendships f
  join profiles p on p.id = case when f.user_low = auth.uid() then f.user_high else f.user_low end
  where auth.uid() in (f.user_low, f.user_high) and f.status = 'accepted'
  order by p.display_name;
$$;

-- Beefs about me. Creator is hidden unless revealed or not anonymous.
create or replace function public.beefs_for_me()
returns table (id uuid, kind text, reason text, spice smallint, status text, created_at timestamptz,
               creator uuid, creator_name text, creator_color text, is_match boolean,
               reveal_status text, open_offer_from_creator boolean)
language sql stable security definer set search_path = public as $$
  select b.id, b.kind,
         case when b.anonymous and not b.revealed then null else b.reason end,
         b.spice, b.status, b.created_at,
         case when b.anonymous and not b.revealed then null else b.creator end,
         case when b.anonymous and not b.revealed then null else p.display_name end,
         case when b.anonymous and not b.revealed then null else p.color end,
         exists (select 1 from beefs m where m.creator = auth.uid() and m.target = b.creator
                 and m.status in ('pending', 'in_progress')),
         (select r.status from reveal_requests r where r.beef_id = b.id),
         exists (select 1 from offers o where o.beef_id = b.id and o.from_user = b.creator and o.status = 'open')
  from beefs b join profiles p on p.id = b.creator
  where b.target = auth.uid() and b.status in ('pending', 'in_progress', 'settled', 'forgiven')
  order by b.created_at desc;
$$;

-- "Who's got beef with me?" counter, capped at 5.
create or replace function public.beef_count_for_me()
returns integer language sql stable security definer set search_path = public as $$
  select least(count(*), 5)::int from beefs
  where target = auth.uid() and status in ('pending', 'in_progress');
$$;

-- Offer a settlement. Either side may offer; the target may offer blind on several beefs.
create or replace function public.make_offer(p_beef uuid, p_type text, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare b beefs; oid uuid;
begin
  select * into b from beefs where id = p_beef;
  if b.id is null or auth.uid() not in (b.creator, b.target) then raise exception 'not allowed'; end if;
  if b.status not in ('pending', 'in_progress') then raise exception 'closed'; end if;
  insert into offers (beef_id, from_user, offer_type, message) values (p_beef, auth.uid(), p_type, p_message)
  returning id into oid;
  update beefs set status = 'in_progress' where id = p_beef;
  return oid;
end $$;

-- The other side answers an offer. Accepting settles the beef.
create or replace function public.respond_offer(p_offer uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare o offers; b beefs;
begin
  select * into o from offers where id = p_offer;
  select * into b from beefs where id = o.beef_id;
  if auth.uid() not in (b.creator, b.target) or auth.uid() = o.from_user then raise exception 'not allowed'; end if;
  update offers set status = case when p_accept then 'accepted' else 'declined' end where id = p_offer;
  if p_accept then update beefs set status = 'settled', closed_at = now() where id = b.id; end if;
end $$;

-- Creator closes a beef without a settlement: forgive (visible) or release (quiet archive).
create or replace function public.close_beef(p_beef uuid, p_how text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_how not in ('forgiven', 'released') then raise exception 'bad value'; end if;
  update beefs set status = p_how, closed_at = now() where id = p_beef and creator = auth.uid();
end $$;

-- Undo "release" from the archive.
create or replace function public.restore_beef(p_beef uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update beefs set status = 'pending', closed_at = null where id = p_beef and creator = auth.uid() and status = 'released';
end $$;

-- Target asks who it was; creator decides.
create or replace function public.request_reveal(p_beef uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from beefs where id = p_beef and target = auth.uid()) then raise exception 'not allowed'; end if;
  insert into reveal_requests (beef_id) values (p_beef) on conflict (beef_id) do nothing;
end $$;

create or replace function public.respond_reveal(p_beef uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from beefs where id = p_beef and creator = auth.uid()) then raise exception 'not allowed'; end if;
  update reveal_requests set status = case when p_accept then 'accepted' else 'declined' end where beef_id = p_beef;
  if p_accept then update beefs set revealed = true where id = p_beef; end if;
end $$;

-- "This isn't funny to me": removes the beef at once, optionally blocks future beefs from that person.
create or replace function public.report_beef(p_beef uuid, p_reason text, p_block boolean)
returns void language plpgsql security definer set search_path = public as $$
declare b beefs;
begin
  select * into b from beefs where id = p_beef and target = auth.uid();
  if b.id is null then raise exception 'not allowed'; end if;
  insert into reports (beef_id, reporter, reason) values (p_beef, auth.uid(), p_reason);
  update beefs set status = 'removed', closed_at = now() where id = p_beef;
  if p_block then insert into blocks (blocker, blocked) values (auth.uid(), b.creator) on conflict do nothing; end if;
end $$;

-- "Karma reset": leave every list and stop everything.
create or replace function public.karma_reset()
returns void language plpgsql security definer set search_path = public as $$
begin
  update beefs set status = 'removed', closed_at = now()
  where (target = auth.uid() or creator = auth.uid()) and status in ('pending', 'in_progress');
end $$;

-- Beefs I created, with the target's name and what is waiting for me.
create or replace function public.my_beefs()
returns table (id uuid, target uuid, target_name text, target_color text, kind text, reason text,
               spice smallint, anonymous boolean, revealed boolean, status text, created_at timestamptz,
               closed_at timestamptz, open_offer_from_target boolean, reveal_status text)
language sql stable security definer set search_path = public as $$
  select b.id, b.target, p.display_name, p.color, b.kind, b.reason, b.spice, b.anonymous, b.revealed,
         b.status, b.created_at, b.closed_at,
         exists (select 1 from offers o where o.beef_id = b.id and o.from_user = b.target and o.status = 'open'),
         (select r.status from reveal_requests r where r.beef_id = b.id)
  from beefs b join profiles p on p.id = b.target
  where b.creator = auth.uid() and b.status <> 'removed'
  order by b.created_at desc;
$$;

-- Offers on one beef, for either side. Never exposes the other user's id.
create or replace function public.offers_for_beef(p_beef uuid)
returns table (id uuid, mine boolean, offer_type text, message text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, o.from_user = auth.uid(), o.offer_type, o.message, o.status, o.created_at
  from offers o join beefs b on b.id = o.beef_id
  where o.beef_id = p_beef and auth.uid() in (b.creator, b.target)
  order by o.created_at;
$$;

grant execute on all functions in schema public to authenticated;
