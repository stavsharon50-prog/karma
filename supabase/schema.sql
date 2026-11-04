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

-- ───────────────────────── text filter ─────────────────────────
-- Generated from moderation.js (same lists the app uses). Terms are stored already normalized.
create table if not exists public.moderation_terms (
  term     text not null,
  mode     text not null check (mode in ('contains', 'word')),
  category text not null,
  primary key (term, mode)
);
alter table public.moderation_terms enable row level security;
delete from public.moderation_terms;
insert into public.moderation_terms (term, mode, category) values
  ('אהרוג', 'contains', 'violence'),
  ('להרוג', 'contains', 'violence'),
  ('יהרוג', 'contains', 'violence'),
  ('תהרוג', 'contains', 'violence'),
  ('נהרוג', 'contains', 'violence'),
  ('ארצח', 'contains', 'violence'),
  ('לרצוח', 'contains', 'violence'),
  ('רוצח', 'contains', 'violence'),
  ('ירצח', 'contains', 'violence'),
  ('אשבורלכ', 'contains', 'violence'),
  ('אשבוראותכ', 'contains', 'violence'),
  ('לשבורלכ', 'contains', 'violence'),
  ('אשבורלה', 'contains', 'violence'),
  ('אשבורלו', 'contains', 'violence'),
  ('ארביצ', 'contains', 'violence'),
  ('להרביצ', 'contains', 'violence'),
  ('נרביצ', 'contains', 'violence'),
  ('מרביצימ', 'contains', 'violence'),
  ('אדקור', 'contains', 'violence'),
  ('לדקור', 'contains', 'violence'),
  ('נדקור', 'contains', 'violence'),
  ('סכינ', 'contains', 'violence'),
  ('אקדח', 'contains', 'violence'),
  ('לירותב', 'contains', 'violence'),
  ('אירהב', 'contains', 'violence'),
  ('יריות', 'contains', 'violence'),
  ('לפוצצאות', 'contains', 'violence'),
  ('אפוצצ', 'contains', 'violence'),
  ('לחנוק', 'contains', 'violence'),
  ('אחנוק', 'contains', 'violence'),
  ('שתמות', 'contains', 'violence'),
  ('תמותי', 'contains', 'violence'),
  ('שתמותי', 'contains', 'violence'),
  ('תמותו', 'contains', 'violence'),
  ('תתאבד', 'contains', 'violence'),
  ('להתאבד', 'contains', 'violence'),
  ('לכתתלה', 'contains', 'violence'),
  ('תתליאתעצמכ', 'contains', 'violence'),
  ('לאנוס', 'contains', 'violence'),
  ('אונס', 'contains', 'violence'),
  ('אנסו', 'contains', 'violence'),
  ('killyou', 'contains', 'violence'),
  ('killyour', 'contains', 'violence'),
  ('killyourself', 'contains', 'violence'),
  ('gonnakill', 'contains', 'violence'),
  ('rape', 'contains', 'violence'),
  ('shootyou', 'contains', 'violence'),
  ('stab', 'contains', 'violence'),
  ('רצח', 'word', 'violence'),
  ('מכות', 'word', 'violence'),
  ('תמות', 'word', 'violence'),
  ('kys', 'word', 'violence'),
  ('עושימחרמ', 'contains', 'ostracism'),
  ('לעשותחרמ', 'contains', 'ostracism'),
  ('נעשהחרמ', 'contains', 'ostracism'),
  ('חרמעל', 'contains', 'ostracism'),
  ('להחרימ', 'contains', 'ostracism'),
  ('מחרימימ', 'contains', 'ostracism'),
  ('נחרימ', 'contains', 'ostracism'),
  ('כולמשונאימ', 'contains', 'ostracism'),
  ('כולנושונאימ', 'contains', 'ostracism'),
  ('כולמצוחקימעליכ', 'contains', 'ostracism'),
  ('כולמצוחקימעלייכ', 'contains', 'ostracism'),
  ('אפאחדלאאוהב', 'contains', 'ostracism'),
  ('אפאחדלארוצהאות', 'contains', 'ostracism'),
  ('אלתדברואיתה', 'contains', 'ostracism'),
  ('אלתדברואיתו', 'contains', 'ostracism'),
  ('אלתזמינו', 'contains', 'ostracism'),
  ('לאמגיעלכלחיות', 'contains', 'ostracism'),
  ('עופימפה', 'contains', 'ostracism'),
  ('עופמפה', 'contains', 'ostracism'),
  ('תעלמימהעולמ', 'contains', 'ostracism'),
  ('תעלממהעולמ', 'contains', 'ostracism'),
  ('עדיפבלעדיכ', 'contains', 'ostracism'),
  ('עדיפבלעדייכ', 'contains', 'ostracism'),
  ('nobodylikesyou', 'contains', 'ostracism'),
  ('everyonehatesyou', 'contains', 'ostracism'),
  ('חרמ', 'word', 'ostracism'),
  ('בחרמ', 'word', 'ostracism'),
  ('לחרמ', 'word', 'ostracism'),
  ('ערבוש', 'contains', 'hate'),
  ('כושי', 'contains', 'hate'),
  ('כושית', 'contains', 'hate'),
  ('כושימ', 'contains', 'hate'),
  ('קוקסינל', 'contains', 'hate'),
  ('מתרוממ', 'contains', 'hate'),
  ('נאצי', 'contains', 'hate'),
  ('היטלר', 'contains', 'hate'),
  ('יהודונ', 'contains', 'hate'),
  ('מחבלמסריח', 'contains', 'hate'),
  ('מפגר', 'contains', 'hate'),
  ('מפגרת', 'contains', 'hate'),
  ('מפגרימ', 'contains', 'hate'),
  ('אוטיסטמ', 'contains', 'hate'),
  ('nigg', 'contains', 'hate'),
  ('faggot', 'contains', 'hate'),
  ('retard', 'contains', 'hate'),
  ('tranny', 'contains', 'hate'),
  ('הומו', 'word', 'hate'),
  ('הומואימ', 'word', 'hate'),
  ('fag', 'word', 'hate'),
  ('זונה', 'contains', 'sexual'),
  ('שרמוטה', 'contains', 'sexual'),
  ('שרמוט', 'contains', 'sexual'),
  ('כוסאמא', 'contains', 'sexual'),
  ('כוסאמק', 'contains', 'sexual'),
  ('כוסעמק', 'contains', 'sexual'),
  ('כוסית', 'contains', 'sexual'),
  ('בנזונה', 'contains', 'sexual'),
  ('בתזונה', 'contains', 'sexual'),
  ('מזדיינ', 'contains', 'sexual'),
  ('תזדיינ', 'contains', 'sexual'),
  ('תזדייני', 'contains', 'sexual'),
  ('לזיינ', 'contains', 'sexual'),
  ('מזיינ', 'contains', 'sexual'),
  ('זיונ', 'contains', 'sexual'),
  ('ציצימ', 'contains', 'sexual'),
  ('מניאק', 'contains', 'sexual'),
  ('מניאקית', 'contains', 'sexual'),
  ('חתיכתזבל', 'contains', 'sexual'),
  ('חתיכתחרא', 'contains', 'sexual'),
  ('fuck', 'contains', 'sexual'),
  ('bitch', 'contains', 'sexual'),
  ('slut', 'contains', 'sexual'),
  ('whore', 'contains', 'sexual'),
  ('cunt', 'contains', 'sexual'),
  ('dick', 'contains', 'sexual'),
  ('זינ', 'word', 'sexual'),
  ('זיינ', 'word', 'sexual'),
  ('sex', 'word', 'sexual'),
  ('סקס', 'word', 'sexual'),
  ('מכוערת', 'contains', 'body'),
  ('מכוער', 'contains', 'body'),
  ('שמנה', 'contains', 'body'),
  ('שמנימ', 'contains', 'body'),
  ('שמנמנה', 'contains', 'body'),
  ('אנורקסית', 'contains', 'body'),
  ('פרצופשלחזיר', 'contains', 'body'),
  ('חזירה', 'contains', 'body'),
  ('דובהשמנה', 'contains', 'body'),
  ('אתהשמנ', 'contains', 'body'),
  ('שמנכמו', 'contains', 'body'),
  ('שמנומכוער', 'contains', 'body'),
  ('שמנמגעיל', 'contains', 'body'),
  ('פרה', 'word', 'body'),
  ('ugly', 'word', 'body'),
  ('fat', 'word', 'body');

-- Same normalization as moderation.js: lowercase, no vowel marks, final letters → regular,
-- look-alike digits/symbols → letters, letters repeated 3+ times → once.
create or replace function public.mod_normalize(t text)
returns text language sql immutable as $$
  select regexp_replace(
           translate(regexp_replace(lower(coalesce(t, '')), '[\u0591-\u05C7]', '', 'g'),
                     'ךםןףץ013457@$', 'כמנפצoieastas'),
           '(.)\1\1+', '\1', 'g');
$$;

-- Returns the matched category, or null when the text is fine.
create or replace function public.moderation_check(t text)
returns text language sql stable security definer set search_path = public as $$
  with n as (select mod_normalize(t) as n),
       c as (select regexp_replace(n, '[^a-zא-ת]', '', 'g') as c from n),
       w as (select unnest(regexp_split_to_array(n, '[^a-zא-ת]+')) as w from n),
       v as (select w from w where w <> ''
             union select substr(w, 2) from w where length(w) > 3 and strpos('והש', left(w, 1)) > 0
             union select substr(w, 3) from w where length(w) > 4 and strpos('והש', left(w, 1)) > 0
                                                 and strpos('והש', substr(w, 2, 1)) > 0)
  select m.category from moderation_terms m, c
  where (m.mode = 'contains' and strpos(c.c, m.term) > 0)
     or (m.mode = 'word' and m.term in (select w from v))
  limit 1;
$$;

-- Guard rails on insert: friends only, not blocked, clean text, no pile-ons, max 3 open beefs per pair.
create or replace function public.beef_insert_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.creator <> auth.uid() then raise exception 'not allowed'; end if;
  if not are_friends(new.creator, new.target) then raise exception 'not_friends'; end if;
  if exists (select 1 from blocks where blocker = new.target and blocked = new.creator) then
    raise exception 'blocked';
  end if;
  if moderation_check(new.reason) is not null then
    raise exception 'moderation:%', moderation_check(new.reason);
  end if;
  -- Someone whose beefs were reported twice in 30 days is paused.
  if (select count(distinct r.beef_id) from reports r join beefs b on b.id = r.beef_id
      where b.creator = new.creator and r.created_at > now() - interval '30 days') >= 2 then
    raise exception 'paused';
  end if;
  -- At most 8 new beefs a day per person.
  if (select count(*) from beefs where creator = new.creator and created_at > now() - interval '24 hours') >= 8 then
    raise exception 'slow_down';
  end if;
  -- Pile-on protection: if 4 different people opened a beef on the same person in 48 hours, wait.
  if (select count(distinct creator) from beefs where target = new.target and creator <> new.creator
      and created_at > now() - interval '48 hours') >= 4 then
    raise exception 'cooldown';
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
  if moderation_check(p_name) is not null then raise exception 'moderation:%', moderation_check(p_name); end if;
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
  if moderation_check(p_message) is not null then raise exception 'moderation:%', moderation_check(p_message); end if;
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


-- ═════════════════════════ Phase 2: bets, good karma, group cards, wishlist ═════════════════════════

-- Small helper used by everything below: raise if text fails the filter.
create or replace function public.assert_clean(t text)
returns void language plpgsql stable security definer set search_path = public as $$
declare c text;
begin
  c := moderation_check(t);
  if c is not null then raise exception 'moderation:%', c; end if;
end $$;

-- ───────────────────────── wishlist ("what makes me happy") ─────────────────────────
alter table public.profiles add column if not exists likes jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists birthday text check (birthday is null or birthday ~ '^\d{2}-\d{2}$');

create or replace function public.update_likes(p_likes jsonb, p_birthday text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if length(p_likes::text) > 2000 then raise exception 'too_long'; end if;
  perform assert_clean(p_likes::text);
  update profiles set likes = coalesce(p_likes, '{}'::jsonb), birthday = nullif(p_birthday, '') where id = auth.uid();
end $$;

create or replace function public.friend_profile(p_friend uuid)
returns table (id uuid, display_name text, color text, pronoun text, likes jsonb, birthday text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.color, p.pronoun, p.likes, p.birthday from profiles p
  where p.id = p_friend and (p_friend = auth.uid() or are_friends(p_friend, auth.uid()));
$$;

-- ───────────────────────── bets ─────────────────────────
create table if not exists public.bets (
  id            uuid primary key default gen_random_uuid(),
  creator       uuid not null references public.profiles (id) on delete cascade,
  opponent      uuid not null references public.profiles (id) on delete cascade,
  topic         text not null check (char_length(topic) between 2 and 80),
  creator_side  text not null check (char_length(creator_side) between 1 and 30),
  opponent_side text not null check (char_length(opponent_side) between 1 and 30),
  category      text not null default 'free' check (category in ('sport', 'reality', 'personal', 'free')),
  stake         text not null check (stake in ('coffee', 'apology', 'song', 'next_time', 'custom')),
  stake_text    text check (char_length(stake_text) <= 60),
  resolve_on    date not null,
  status        text not null default 'proposed'
                check (status in ('proposed', 'active', 'declined', 'disputed', 'resolved', 'cancelled')),
  awaiting      uuid references public.profiles (id),
  creator_claim uuid,
  opponent_claim uuid,
  winner        uuid,
  paid          boolean not null default false,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  check (creator <> opponent)
);
create index if not exists bets_creator_idx on public.bets (creator);
create index if not exists bets_opponent_idx on public.bets (opponent);
alter table public.bets enable row level security;
drop policy if exists "bets: players read" on public.bets;
create policy "bets: players read" on public.bets for select using (auth.uid() in (creator, opponent));

create or replace function public.create_bet(p_opponent uuid, p_topic text, p_my_side text, p_their_side text,
                                             p_category text, p_stake text, p_stake_text text, p_resolve_on date)
returns uuid language plpgsql security definer set search_path = public as $$
declare bid uuid;
begin
  if not are_friends(auth.uid(), p_opponent) then raise exception 'not_friends'; end if;
  if exists (select 1 from blocks where blocker = p_opponent and blocked = auth.uid()) then raise exception 'blocked'; end if;
  perform assert_clean(p_topic); perform assert_clean(p_my_side); perform assert_clean(p_their_side); perform assert_clean(p_stake_text);
  if p_resolve_on < current_date or p_resolve_on > current_date + 400 then raise exception 'bad_date'; end if;
  if (select count(*) from bets where creator = auth.uid() and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'slow_down';
  end if;
  insert into bets (creator, opponent, topic, creator_side, opponent_side, category, stake, stake_text, resolve_on, awaiting)
  values (auth.uid(), p_opponent, p_topic, p_my_side, p_their_side, coalesce(p_category, 'free'), p_stake,
          nullif(p_stake_text, ''), p_resolve_on, p_opponent)
  returning id into bid;
  return bid;
end $$;

-- Accept, decline, or counter with a different stake (then the other side has to answer).
create or replace function public.respond_bet(p_bet uuid, p_answer text, p_stake text, p_stake_text text)
returns void language plpgsql security definer set search_path = public as $$
declare b bets;
begin
  select * into b from bets where id = p_bet;
  if b.id is null or b.status <> 'proposed' or b.awaiting <> auth.uid() then raise exception 'not allowed'; end if;
  if p_answer = 'accept' then
    update bets set status = 'active', awaiting = null where id = p_bet;
  elsif p_answer = 'decline' then
    update bets set status = 'declined', awaiting = null where id = p_bet;
  elsif p_answer = 'counter' then
    perform assert_clean(p_stake_text);
    update bets set stake = p_stake, stake_text = nullif(p_stake_text, ''),
      awaiting = case when auth.uid() = b.creator then b.opponent else b.creator end where id = p_bet;
  else raise exception 'bad value'; end if;
end $$;

-- Each side says who won. Same answer → resolved. Different → disputed (they can answer again).
create or replace function public.claim_bet(p_bet uuid, p_winner uuid)
returns text language plpgsql security definer set search_path = public as $$
declare b bets;
begin
  select * into b from bets where id = p_bet;
  if b.id is null or auth.uid() not in (b.creator, b.opponent) or b.status not in ('active', 'disputed') then
    raise exception 'not allowed';
  end if;
  if p_winner not in (b.creator, b.opponent) then raise exception 'bad value'; end if;
  if auth.uid() = b.creator then update bets set creator_claim = p_winner where id = p_bet;
  else update bets set opponent_claim = p_winner where id = p_bet; end if;
  select * into b from bets where id = p_bet;
  if b.creator_claim is not null and b.opponent_claim is not null then
    if b.creator_claim = b.opponent_claim then
      update bets set status = 'resolved', winner = b.creator_claim, resolved_at = now() where id = p_bet;
      return 'resolved';
    else
      update bets set status = 'disputed' where id = p_bet;
      return 'disputed';
    end if;
  end if;
  return 'waiting';
end $$;

-- The winner confirms the loser paid up.
create or replace function public.mark_bet_paid(p_bet uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bets set paid = true where id = p_bet and winner = auth.uid() and status = 'resolved';
end $$;

create or replace function public.cancel_bet(p_bet uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bets set status = 'cancelled', awaiting = null
  where id = p_bet and creator = auth.uid() and status = 'proposed';
end $$;

create or replace function public.my_bets()
returns table (id uuid, other uuid, other_name text, other_color text, other_pronoun text, i_created boolean,
               topic text, my_side text, their_side text, category text, stake text, stake_text text,
               resolve_on date, status text, awaiting_me boolean, my_claim uuid, their_claim uuid,
               i_won boolean, paid boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.id, p.id, p.display_name, p.color, p.pronoun, b.creator = auth.uid(), b.topic,
         case when b.creator = auth.uid() then b.creator_side else b.opponent_side end,
         case when b.creator = auth.uid() then b.opponent_side else b.creator_side end,
         b.category, b.stake, b.stake_text, b.resolve_on, b.status, b.awaiting = auth.uid(),
         case when b.creator = auth.uid() then b.creator_claim else b.opponent_claim end,
         case when b.creator = auth.uid() then b.opponent_claim else b.creator_claim end,
         case when b.winner is null then null else b.winner = auth.uid() end, b.paid, b.created_at
  from bets b join profiles p on p.id = case when b.creator = auth.uid() then b.opponent else b.creator end
  where auth.uid() in (b.creator, b.opponent) and b.status not in ('cancelled')
  order by b.created_at desc;
$$;

-- ───────────────────────── good karma & anonymous compliments ─────────────────────────
create table if not exists public.karma (
  id            uuid primary key default gen_random_uuid(),
  sender        uuid not null references public.profiles (id) on delete cascade,
  recipient     uuid not null references public.profiles (id) on delete cascade,
  kind          text not null default 'karma' check (kind in ('karma', 'compliment')),
  occasion      text check (char_length(occasion) <= 40),
  message       text check (char_length(message) <= 140),
  gift          text not null default 'words',
  anonymous     boolean not null default false,
  revealed      boolean not null default false,
  reveal_status text check (reveal_status in ('open', 'accepted', 'declined')),
  chain_id      uuid,
  chain_depth   int not null default 0,
  passed        boolean not null default false,
  thanked       boolean not null default false,
  deliver_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  check (sender <> recipient)
);
create index if not exists karma_recipient_idx on public.karma (recipient, deliver_at);
create index if not exists karma_sender_idx on public.karma (sender);
create index if not exists karma_chain_idx on public.karma (chain_id);
alter table public.karma enable row level security;
-- Nobody reads the table directly: senders and recipients go through the functions below.

create or replace function public.send_karma(p_recipient uuid, p_kind text, p_occasion text, p_message text,
                                             p_gift text, p_anonymous boolean, p_deliver_at timestamptz, p_pass_from uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare kid uuid; src karma; v_chain uuid; v_depth int := 0;
begin
  if not are_friends(auth.uid(), p_recipient) then raise exception 'not_friends'; end if;
  if exists (select 1 from blocks where blocker = p_recipient and blocked = auth.uid()) then raise exception 'blocked'; end if;
  perform assert_clean(p_occasion); perform assert_clean(p_message);
  if p_kind = 'compliment' and coalesce(p_message, '') = '' then raise exception 'empty'; end if;
  if p_deliver_at > now() + interval '400 days' then raise exception 'bad_date'; end if;
  if (select count(*) from karma where sender = auth.uid() and created_at > now() - interval '24 hours') >= 30 then
    raise exception 'slow_down';
  end if;
  if p_pass_from is not null then
    select * into src from karma where id = p_pass_from and recipient = auth.uid() and not passed
      and deliver_at <= now() and deliver_at > now() - interval '24 hours';
    if src.id is null then raise exception 'chain_expired'; end if;
    v_chain := coalesce(src.chain_id, src.id); v_depth := src.chain_depth + 1;
    update karma set passed = true, chain_id = coalesce(chain_id, id) where id = src.id;
  end if;
  insert into karma (sender, recipient, kind, occasion, message, gift, anonymous, deliver_at, chain_id, chain_depth)
  values (auth.uid(), p_recipient, coalesce(p_kind, 'karma'), nullif(p_occasion, ''), nullif(p_message, ''),
          coalesce(p_gift, 'words'), coalesce(p_anonymous, false) or p_kind = 'compliment',
          greatest(coalesce(p_deliver_at, now()), now()), v_chain, v_depth)
  returning id into kid;
  return kid;
end $$;

-- What I received (only once delivered). Anonymous senders stay hidden until a mutual reveal.
create or replace function public.karma_inbox()
returns table (id uuid, kind text, occasion text, message text, gift text, sender uuid, sender_name text,
               sender_color text, anonymous boolean, reveal_status text, thanked boolean, can_pass boolean,
               pass_until timestamptz, chain_length int, delivered_at timestamptz)
language sql stable security definer set search_path = public as $$
  select k.id, k.kind, k.occasion, k.message, k.gift,
         case when k.anonymous and not k.revealed then null else k.sender end,
         case when k.anonymous and not k.revealed then null else p.display_name end,
         case when k.anonymous and not k.revealed then null else p.color end,
         k.anonymous and not k.revealed, k.reveal_status, k.thanked,
         not k.passed and k.deliver_at > now() - interval '24 hours',
         k.deliver_at + interval '24 hours',
         case when k.chain_id is null then 1 else (select count(*)::int + 1 from karma c where c.chain_id = k.chain_id and c.id <> k.chain_id) end,
         k.deliver_at
  from karma k join profiles p on p.id = k.sender
  where k.recipient = auth.uid() and k.deliver_at <= now()
  order by k.deliver_at desc;
$$;

create or replace function public.karma_sent()
returns table (id uuid, kind text, occasion text, message text, gift text, recipient uuid, recipient_name text,
               recipient_color text, anonymous boolean, reveal_status text, thanked boolean, deliver_at timestamptz,
               scheduled boolean)
language sql stable security definer set search_path = public as $$
  select k.id, k.kind, k.occasion, k.message, k.gift, k.recipient, p.display_name, p.color, k.anonymous,
         k.reveal_status, k.thanked, k.deliver_at, k.deliver_at > now()
  from karma k join profiles p on p.id = k.recipient
  where k.sender = auth.uid()
  order by k.deliver_at desc;
$$;

create or replace function public.cancel_karma(p_karma uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from karma where id = p_karma and sender = auth.uid() and deliver_at > now();
end $$;

create or replace function public.thank_karma(p_karma uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update karma set thanked = true where id = p_karma and recipient = auth.uid() and deliver_at <= now();
end $$;

create or replace function public.request_karma_reveal(p_karma uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update karma set reveal_status = 'open'
  where id = p_karma and recipient = auth.uid() and anonymous and not revealed and reveal_status is null;
end $$;

create or replace function public.respond_karma_reveal(p_karma uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update karma set reveal_status = case when p_accept then 'accepted' else 'declined' end,
                   revealed = p_accept
  where id = p_karma and sender = auth.uid() and reveal_status = 'open';
end $$;

-- ───────────────────────── group cards (everyone writes, one person receives) ─────────────────────────
create table if not exists public.group_cards (
  id         uuid primary key default gen_random_uuid(),
  creator    uuid not null references public.profiles (id) on delete cascade,
  recipient  uuid not null references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 2 and 60),
  closes_at  timestamptz not null,
  delivered  boolean not null default false,
  created_at timestamptz not null default now(),
  check (creator <> recipient)
);
create table if not exists public.group_card_members (
  card_id   uuid not null references public.group_cards (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  message   text check (char_length(message) <= 140),
  joined_at timestamptz,
  primary key (card_id, user_id)
);
alter table public.group_cards enable row level security;
alter table public.group_card_members enable row level security;

create or replace function public.create_group_card(p_recipient uuid, p_title text, p_closes_at timestamptz,
                                                    p_message text, p_invitees uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; u uuid;
begin
  if not are_friends(auth.uid(), p_recipient) then raise exception 'not_friends'; end if;
  perform assert_clean(p_title); perform assert_clean(p_message);
  if p_closes_at < now() or p_closes_at > now() + interval '30 days' then raise exception 'bad_date'; end if;
  insert into group_cards (creator, recipient, title, closes_at) values (auth.uid(), p_recipient, p_title, p_closes_at)
  returning id into cid;
  insert into group_card_members (card_id, user_id, message, joined_at) values (cid, auth.uid(), nullif(p_message, ''), now());
  foreach u in array coalesce(p_invitees, '{}') loop
    if u <> p_recipient and u <> auth.uid() and are_friends(auth.uid(), u) then
      insert into group_card_members (card_id, user_id) values (cid, u) on conflict do nothing;
    end if;
  end loop;
  return cid;
end $$;

create or replace function public.join_group_card(p_card uuid, p_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_clean(p_message);
  update group_card_members set message = nullif(p_message, ''), joined_at = now()
  where card_id = p_card and user_id = auth.uid()
    and exists (select 1 from group_cards c where c.id = p_card and not c.delivered and c.closes_at > now());
end $$;

create or replace function public.deliver_group_card(p_card uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update group_cards set delivered = true where id = p_card and creator = auth.uid();
end $$;

-- Cards I make or was invited to (never the ones about me before delivery).
create or replace function public.my_group_cards()
returns table (id uuid, title text, recipient uuid, recipient_name text, recipient_color text, i_created boolean,
               closes_at timestamptz, delivered boolean, joined boolean, members int, joined_count int)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, c.recipient, p.display_name, p.color, c.creator = auth.uid(), c.closes_at,
         c.delivered or c.closes_at <= now(), m.joined_at is not null,
         (select count(*)::int from group_card_members x where x.card_id = c.id),
         (select count(*)::int from group_card_members x where x.card_id = c.id and x.joined_at is not null)
  from group_cards c join group_card_members m on m.card_id = c.id and m.user_id = auth.uid()
  join profiles p on p.id = c.recipient
  order by c.created_at desc;
$$;

-- Cards for me, once delivered.
create or replace function public.group_cards_for_me()
returns table (id uuid, title text, creator_name text, delivered_at timestamptz, members int)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, p.display_name, least(c.closes_at, now()),
         (select count(*)::int from group_card_members x where x.card_id = c.id and x.joined_at is not null)
  from group_cards c join profiles p on p.id = c.creator
  where c.recipient = auth.uid() and (c.delivered or c.closes_at <= now())
  order by c.created_at desc;
$$;

-- Messages on one card: for members always, for the recipient only after delivery.
create or replace function public.group_card_messages(p_card uuid)
returns table (user_id uuid, name text, color text, message text, joined boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name, p.color, m.message, m.joined_at is not null
  from group_card_members m join profiles p on p.id = m.user_id
  join group_cards c on c.id = m.card_id
  where m.card_id = p_card
    and (exists (select 1 from group_card_members me where me.card_id = p_card and me.user_id = auth.uid())
         or (c.recipient = auth.uid() and (c.delivered or c.closes_at <= now())))
  order by m.joined_at nulls last;
$$;

-- ───────────────────────── balance with one friend ─────────────────────────
-- Good karma both ways, beefs I opened on them, beefs on me only if they are not hidden, and bets.
create or replace function public.friend_timeline(p_friend uuid)
returns table (item text, mine boolean, title text, status text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'karma'::text, k.sender = auth.uid(), coalesce(k.occasion, k.message, 'קארמה טובה'), null::text, k.deliver_at
    from karma k
    where are_friends(auth.uid(), p_friend) and k.deliver_at <= now() and not (k.anonymous and not k.revealed)
      and ((k.sender = auth.uid() and k.recipient = p_friend) or (k.sender = p_friend and k.recipient = auth.uid()))
    union all
    select 'beef', true, b.reason, b.status, b.created_at from beefs b
    where are_friends(auth.uid(), p_friend) and b.creator = auth.uid() and b.target = p_friend and b.status not in ('removed', 'released')
    union all
    select 'beef', false, b.reason, b.status, b.created_at from beefs b
    where are_friends(auth.uid(), p_friend) and b.creator = p_friend and b.target = auth.uid()
      and (not b.anonymous or b.revealed) and b.status not in ('removed', 'released')
    union all
    select 'bet', b.winner = auth.uid(), b.topic, b.status, b.created_at from bets b
    where are_friends(auth.uid(), p_friend) and b.status in ('active', 'resolved', 'disputed')
      and ((b.creator = auth.uid() and b.opponent = p_friend) or (b.creator = p_friend and b.opponent = auth.uid()))
  ) t order by 5 desc limit 60;
$$;


-- ═════════════════════════ Notifications ("what happened since I was here") ═════════════════════════
-- Rows are written only by the triggers below. The app composes the words (with the right gender),
-- so a row holds the kind, who did it (null when that must stay anonymous) and what it is about.
create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null,
  actor      uuid references public.profiles (id) on delete set null,
  ref        uuid,
  extra      jsonb not null default '{}'::jsonb,
  visible_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, visible_at desc);
alter table public.notifications enable row level security;

create or replace function public.notify(p_user uuid, p_kind text, p_actor uuid, p_ref uuid, p_extra jsonb, p_at timestamptz default now())
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, actor, ref, extra, visible_at)
  select p_user, p_kind, p_actor, p_ref, coalesce(p_extra, '{}'::jsonb), coalesce(p_at, now())
  where p_user is not null and p_user is distinct from p_actor;
$$;

-- Beefs: new one (anonymous stays anonymous), forgiven, removed.
create or replace function public.trg_beefs_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare hidden boolean := new.anonymous and not new.revealed;
begin
  if tg_op = 'INSERT' then
    perform notify(new.target, 'beef_new', case when hidden then null else new.creator end, new.id,
                   jsonb_build_object('kind', new.kind, 'spice', new.spice));
  elsif new.status is distinct from old.status then
    if new.status = 'forgiven' then
      perform notify(new.target, 'beef_forgiven', case when hidden then null else new.creator end, new.id,
                     case when hidden then '{}'::jsonb else jsonb_build_object('reason', new.reason) end);
    elsif new.status = 'removed' then
      delete from notifications where ref = new.id and kind like 'beef%';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists beefs_notify on public.beefs;
create trigger beefs_notify after insert or update on public.beefs for each row execute function public.trg_beefs_notify();

-- Offers: new offer, accepted, declined.
create or replace function public.trg_offers_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare b beefs; other uuid; hidden boolean;
begin
  select * into b from beefs where id = new.beef_id;
  hidden := b.anonymous and not b.revealed;
  if tg_op = 'INSERT' then
    other := case when new.from_user = b.creator then b.target else b.creator end;
    perform notify(other, 'offer_new',
                   case when new.from_user = b.creator and hidden then null else new.from_user end, b.id,
                   jsonb_build_object('offer_type', new.offer_type, 'reason', case when other = b.creator then b.reason end));
  elsif new.status is distinct from old.status and new.status in ('accepted', 'declined') then
    other := case when new.from_user = b.creator then b.target else b.creator end;
    perform notify(new.from_user, 'offer_' || new.status,
                   case when other = b.creator and hidden then null else other end, b.id,
                   jsonb_build_object('offer_type', new.offer_type));
  end if;
  return new;
end $$;
drop trigger if exists offers_notify on public.offers;
create trigger offers_notify after insert or update on public.offers for each row execute function public.trg_offers_notify();

-- Reveal requests on beefs.
create or replace function public.trg_reveals_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare b beefs;
begin
  select * into b from beefs where id = new.beef_id;
  if tg_op = 'INSERT' then
    perform notify(b.creator, 'reveal_request', b.target, b.id, jsonb_build_object('reason', b.reason));
  elsif new.status is distinct from old.status then
    perform notify(b.target, 'reveal_' || new.status, case when new.status = 'accepted' then b.creator end, b.id, '{}'::jsonb);
  end if;
  return new;
end $$;
drop trigger if exists reveals_notify on public.reveal_requests;
create trigger reveals_notify after insert or update on public.reveal_requests for each row execute function public.trg_reveals_notify();

-- Bets: every step, to whoever did not just act.
create or replace function public.trg_bets_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare ex jsonb := jsonb_build_object('topic', new.topic, 'stake', new.stake);
        other uuid := case when auth.uid() = new.creator then new.opponent else new.creator end;
begin
  if tg_op = 'INSERT' then
    perform notify(new.opponent, 'bet_new', new.creator, new.id, ex); return new;
  end if;
  if new.status = 'proposed' and new.awaiting is distinct from old.awaiting then
    perform notify(new.awaiting, 'bet_counter', other_of(new, new.awaiting), new.id, ex);
  elsif new.status is distinct from old.status then
    if new.status in ('active', 'declined') then
      perform notify(other, 'bet_' || case when new.status = 'active' then 'accepted' else 'declined' end, auth.uid(), new.id, ex);
    elsif new.status = 'resolved' then
      perform notify(new.creator, 'bet_resolved', new.opponent, new.id, ex || jsonb_build_object('won', new.winner = new.creator));
      perform notify(new.opponent, 'bet_resolved', new.creator, new.id, ex || jsonb_build_object('won', new.winner = new.opponent));
    elsif new.status = 'disputed' then
      perform notify(other, 'bet_disputed', auth.uid(), new.id, ex);
    end if;
  elsif new.status = 'active' and (new.creator_claim is null or new.opponent_claim is null)
        and (new.creator_claim is distinct from old.creator_claim or new.opponent_claim is distinct from old.opponent_claim) then
    perform notify(other, 'bet_claimed', auth.uid(), new.id, ex);
  elsif new.paid and not old.paid then
    perform notify(other, 'bet_paid', auth.uid(), new.id, ex);
  end if;
  return new;
end $$;
create or replace function public.other_of(b bets, u uuid)
returns uuid language sql immutable as $$ select case when u = b.creator then b.opponent else b.creator end $$;
drop trigger if exists bets_notify on public.bets;
create trigger bets_notify after insert or update on public.bets for each row execute function public.trg_bets_notify();

-- Good karma & compliments: arrive at delivery time; thanks and reveals go back to the sender.
create or replace function public.trg_karma_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform notify(new.recipient, case when new.kind = 'compliment' then 'compliment_new' else 'karma_new' end,
                   case when new.anonymous then null else new.sender end, new.id,
                   jsonb_build_object('occasion', new.occasion), new.deliver_at);
  elsif tg_op = 'DELETE' then
    delete from notifications where ref = old.id and user_id = old.recipient;
    return old;
  else
    if new.thanked and not old.thanked then
      perform notify(new.sender, 'karma_thanked', new.recipient, new.id, jsonb_build_object('occasion', new.occasion, 'message', new.message));
    end if;
    if new.reveal_status is distinct from old.reveal_status then
      if new.reveal_status = 'open' then
        perform notify(new.sender, 'karma_reveal_request', new.recipient, new.id, jsonb_build_object('message', new.message));
      elsif new.reveal_status = 'accepted' then
        perform notify(new.recipient, 'karma_reveal_accepted', new.sender, new.id, jsonb_build_object('message', new.message));
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists karma_notify on public.karma;
create trigger karma_notify after insert or update or delete on public.karma for each row execute function public.trg_karma_notify();

-- Group cards: invitations, and the card itself to the recipient when it closes (or is sent early).
create or replace function public.trg_cards_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform notify(new.recipient, 'card_delivered', new.creator, new.id, jsonb_build_object('title', new.title), new.closes_at);
  elsif new.delivered and not old.delivered then
    update notifications set visible_at = now() where ref = new.id and kind = 'card_delivered' and visible_at > now();
  end if;
  return new;
end $$;
drop trigger if exists cards_notify on public.group_cards;
create trigger cards_notify after insert or update on public.group_cards for each row execute function public.trg_cards_notify();

create or replace function public.trg_card_members_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare c group_cards;
begin
  select * into c from group_cards where id = new.card_id;
  if new.joined_at is null then
    perform notify(new.user_id, 'card_invite', c.creator, c.id, jsonb_build_object('title', c.title));
  end if;
  return new;
end $$;
drop trigger if exists card_members_notify on public.group_card_members;
create trigger card_members_notify after insert on public.group_card_members for each row execute function public.trg_card_members_notify();

-- Friends: someone joined through my link.
create or replace function public.trg_friends_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
    perform notify(case when auth.uid() = new.user_low then new.user_high else new.user_low end, 'friend_joined', auth.uid(), null, '{}'::jsonb);
  end if;
  return new;
end $$;
drop trigger if exists friends_notify on public.friendships;
create trigger friends_notify after insert or update on public.friendships for each row execute function public.trg_friends_notify();

create or replace function public.my_notifications()
returns table (id bigint, kind text, actor uuid, actor_name text, actor_color text, actor_pronoun text,
               ref uuid, extra jsonb, at timestamptz, unread boolean)
language sql stable security definer set search_path = public as $$
  select n.id, n.kind, n.actor, p.display_name, p.color, p.pronoun, n.ref, n.extra, n.visible_at, n.read_at is null
  from notifications n left join profiles p on p.id = n.actor
  where n.user_id = auth.uid() and n.visible_at <= now()
  order by n.visible_at desc limit 100;
$$;

create or replace function public.unread_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from notifications where user_id = auth.uid() and read_at is null and visible_at <= now();
$$;

create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = auth.uid() and read_at is null and visible_at <= now();
$$;

-- ───────────────────────── "My gifts": what others owe me, to redeem ─────────────────────────
alter table public.offers add column if not exists fulfilled boolean not null default false;

-- Everything I am owed: accepted settlement offers made to me, bets I won, gifts attached to good karma.
create or replace function public.my_wallet()
returns table (source text, id uuid, from_user uuid, from_name text, from_color text, what text, what_text text,
               about text, at timestamptz, redeemed boolean)
language sql stable security definer set search_path = public as $$
  select 'offer', o.id, o.from_user, p.display_name, p.color, o.offer_type, o.message, b.reason, b.closed_at, o.fulfilled
  from offers o join beefs b on b.id = o.beef_id join profiles p on p.id = o.from_user
  where b.creator = auth.uid() and o.status = 'accepted'
  union all
  select 'bet', b.id, case when b.creator = auth.uid() then b.opponent else b.creator end, p.display_name, p.color,
         b.stake, b.stake_text, b.topic, b.resolved_at, b.paid
  from bets b join profiles p on p.id = case when b.creator = auth.uid() then b.opponent else b.creator end
  where b.status = 'resolved' and b.winner = auth.uid()
  union all
  select 'karma', k.id, case when k.anonymous and not k.revealed then null else k.sender end,
         case when k.anonymous and not k.revealed then null else p.display_name end,
         case when k.anonymous and not k.revealed then null else p.color end,
         k.gift, k.message, k.occasion, k.deliver_at, false
  from karma k join profiles p on p.id = k.sender
  where k.recipient = auth.uid() and k.gift <> 'words' and k.deliver_at <= now()
  order by 9 desc nulls last;
$$;

create or replace function public.mark_offer_fulfilled(p_offer uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update offers o set fulfilled = true from beefs b
  where o.id = p_offer and b.id = o.beef_id and b.creator = auth.uid() and o.status = 'accepted';
end $$;

-- ───────────────────────── delete my account ─────────────────────────
-- Removes the profile and, through the foreign keys, everything tied to it
-- (friendships, beefs, offers, bets, karma, group cards, notifications). Usage events keep no user id.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from profiles where id = auth.uid();
end $$;

grant execute on all functions in schema public to authenticated;
