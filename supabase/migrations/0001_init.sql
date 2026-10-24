-- Grundschema Einkauf (Supabase / Postgres) – siehe docs/konzept.md
-- Alle Beträge in Cent, brutto.

-- ---------------------------------------------------------------------------
-- Stammdaten
-- ---------------------------------------------------------------------------

create table team (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table profile (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text not null,
  team_id uuid references team on delete set null,
  -- Rollen sind kombinierbar; die Teamleitung steht am Team (team.leitung_id)
  ist_gf boolean not null default false,
  ist_einkauf boolean not null default false,
  ist_finanzen boolean not null default false,
  ist_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table team add column leitung_id uuid references profile on delete set null;

insert into team (name) values ('Material'), ('Produktion'), ('Bausysteme');

-- Eine Zeile mit globalen Einstellungen
create table einstellungen (
  id boolean primary key default true check (id),
  -- Anforderungen über diesem Betrag (brutto) gibt zusätzlich die GF frei
  gf_grenze_cent integer not null default 100000 check (gf_grenze_cent >= 0)
);
insert into einstellungen default values;

-- ---------------------------------------------------------------------------
-- Planung: Periode → Key Results, Budgetposten je Team
-- ---------------------------------------------------------------------------

create type periode_status as enum ('planung', 'aktiv', 'abgeschlossen');

create table periode (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,              -- z. B. "Q1 2027"
  beginn date not null,
  ende date not null,
  status periode_status not null default 'planung',
  created_at timestamptz not null default now(),
  check (ende > beginn)
);

create table key_result (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references periode on delete cascade,
  team_id uuid references team on delete set null,   -- leer = teamübergreifend
  kuerzel text not null,                              -- z. B. "KR 2.1"
  titel text not null,
  unique (periode_id, kuerzel),
  unique (id, periode_id)
);

create table budgetposten (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references periode on delete cascade,
  team_id uuid not null references team on delete restrict,
  name text not null,
  key_result_id uuid,
  geplant_cent integer not null default 0 check (geplant_cent >= 0),
  created_at timestamptz not null default now(),
  unique (periode_id, team_id, name),
  unique (id, periode_id, team_id),
  -- Key Result muss aus derselben Periode stammen
  foreign key (key_result_id, periode_id) references key_result (id, periode_id)
);
create index on budgetposten (periode_id, team_id);

-- ---------------------------------------------------------------------------
-- Bestellanforderungen
-- ---------------------------------------------------------------------------

create type anforderung_status as enum (
  'entwurf',          -- in Bearbeitung durch die anfordernde Person
  'bei_teamleitung',  -- wartet auf Freigabe der Teamleitung
  'bei_gf',           -- wartet auf Freigabe der Geschäftsführung
  'freigegeben',      -- wartet auf Bestellung durch den Einkauf
  'bestellt',
  'abgelehnt'
);

create table anforderung (
  id uuid primary key default gen_random_uuid(),
  nr bigint generated always as identity unique,   -- angezeigt als BA-<nr>
  ersteller_id uuid not null references profile on delete restrict,
  periode_id uuid not null references periode on delete restrict,
  team_id uuid not null references team on delete restrict,
  budgetposten_id uuid,                              -- leer = außerplanmäßig
  key_result_id uuid,
  titel text not null,
  beschreibung text,
  begruendung text,
  lieferant text,
  link text,
  betrag_cent integer not null check (betrag_cent > 0),
  gewuenscht_bis date,

  -- Workflow – nur über die Funktionen unten änderbar
  status anforderung_status not null default 'entwurf',
  ausserplanmaessig boolean not null default false,
  eingereicht_am timestamptz,
  teamleitung_von uuid references profile,
  teamleitung_am timestamptz,
  gf_von uuid references profile,
  gf_am timestamptz,
  ablehnungsgrund text,
  bestellt_von uuid references profile,
  bestellt_am timestamptz,
  bestellnummer text,

  created_at timestamptz not null default now(),
  -- Budgetposten muss zu Periode und Team der Anforderung gehören
  foreign key (budgetposten_id, periode_id, team_id) references budgetposten (id, periode_id, team_id),
  foreign key (key_result_id, periode_id) references key_result (id, periode_id)
);
create index on anforderung (ersteller_id);
create index on anforderung (status);
create index on anforderung (budgetposten_id);
create index on anforderung (periode_id, team_id);

create table anforderung_ereignis (
  id bigint generated always as identity primary key,
  anforderung_id uuid not null references anforderung on delete cascade,
  zeit timestamptz not null default now(),
  person_id uuid not null references profile,
  aktion text not null check (aktion in ('eingereicht', 'zurueckgezogen', 'freigegeben', 'abgelehnt', 'bestellt')),
  kommentar text
);
create index on anforderung_ereignis (anforderung_id);

-- ---------------------------------------------------------------------------
-- Rollen-Hilfsfunktionen
-- ---------------------------------------------------------------------------

create function ist_gf() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select ist_gf from profile where id = auth.uid()), false);
$$;

create function ist_einkauf() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select ist_einkauf from profile where id = auth.uid()), false);
$$;

create function ist_finanzen() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select ist_finanzen from profile where id = auth.uid()), false);
$$;

create function ist_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select ist_admin from profile where id = auth.uid()), false);
$$;

create function ist_teamleitung(p_team uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from team where id = p_team and leitung_id = auth.uid());
$$;

-- GF, Einkauf, Finanzen und Admins sehen alle Teams
create function sieht_alle_teams() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select ist_gf or ist_einkauf or ist_finanzen or ist_admin from profile where id = auth.uid()), false);
$$;

create function darf_team_sehen(p_team uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select sieht_alle_teams()
      or ist_teamleitung(p_team)
      or exists (select 1 from profile where id = auth.uid() and team_id = p_team);
$$;

-- ---------------------------------------------------------------------------
-- Profil beim ersten Login (Microsoft) anlegen; der erste Nutzer wird Admin
-- ---------------------------------------------------------------------------

create function name_aus_metadaten(meta jsonb, email text) returns text
  language sql immutable as $$
  select coalesce(
    nullif(meta ->> 'full_name', ''),
    nullif(meta ->> 'name', ''),
    nullif(meta -> 'custom_claims' ->> 'name', ''),
    split_part(email, '@', 1)
  );
$$;

create function profil_anlegen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profile (id, name, email, ist_admin)
  values (new.id, name_aus_metadaten(new.raw_user_meta_data, new.email), new.email,
          not exists (select 1 from profile where ist_admin));
  return new;
end;
$$;

create trigger profil_bei_registrierung
  after insert on auth.users
  for each row execute function profil_anlegen();

create function profil_name_aktualisieren() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  update profile
     set name = name_aus_metadaten(new.raw_user_meta_data, new.email)
   where id = new.id
     and name = split_part(new.email, '@', 1);
  return new;
end;
$$;

create trigger profil_name_bei_login
  after update of raw_user_meta_data on auth.users
  for each row execute function profil_name_aktualisieren();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table team enable row level security;
alter table profile enable row level security;
alter table einstellungen enable row level security;
alter table periode enable row level security;
alter table key_result enable row level security;
alter table budgetposten enable row level security;
alter table anforderung enable row level security;
alter table anforderung_ereignis enable row level security;

-- Stammdaten: alle Angemeldeten lesen (Namen für Freigaben, Teams für Auswahl)
create policy "Teams lesen" on team for select to authenticated using (true);
create policy "Admins pflegen Teams" on team for all to authenticated using (ist_admin()) with check (ist_admin());

create policy "Profile lesen" on profile for select to authenticated using (true);
create policy "Admins pflegen Profile" on profile for update to authenticated using (ist_admin()) with check (ist_admin());

create policy "Einstellungen lesen" on einstellungen for select to authenticated using (true);
create policy "Admins ändern Einstellungen" on einstellungen for update to authenticated using (ist_admin()) with check (ist_admin());

create policy "Perioden lesen" on periode for select to authenticated using (true);
create policy "Finanzen pflegt Perioden" on periode for all to authenticated
  using (ist_finanzen() or ist_admin()) with check (ist_finanzen() or ist_admin());

create policy "Key Results lesen" on key_result for select to authenticated using (true);
create policy "Finanzen pflegt Key Results" on key_result for all to authenticated
  using (ist_finanzen() or ist_admin()) with check (ist_finanzen() or ist_admin());

-- Budget: eigenes Team bzw. alle Teams (GF, Einkauf, Finanzen, Admin)
create policy "Budget lesen" on budgetposten for select to authenticated using (darf_team_sehen(team_id));
create policy "Finanzen pflegt Budget" on budgetposten for all to authenticated
  using (ist_finanzen() or ist_admin()) with check (ist_finanzen() or ist_admin());
-- Teamleitungen planen ihr Team, solange die Periode in Planung ist
create policy "Teamleitung plant Budget" on budgetposten for all to authenticated
  using (ist_teamleitung(team_id) and exists (select 1 from periode p where p.id = periode_id and p.status = 'planung'))
  with check (ist_teamleitung(team_id) and exists (select 1 from periode p where p.id = periode_id and p.status = 'planung'));

-- Anforderungen: eigene, die des geleiteten Teams, oder alle (GF, Einkauf, Finanzen, Admin)
create function darf_anforderung_sehen(p_ersteller uuid, p_team uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select p_ersteller = auth.uid() or ist_teamleitung(p_team) or sieht_alle_teams();
$$;

create policy "Anforderungen lesen" on anforderung for select to authenticated
  using (darf_anforderung_sehen(ersteller_id, team_id));
create policy "eigene Anforderungen anlegen" on anforderung for insert to authenticated
  with check (ersteller_id = auth.uid());
create policy "eigene Entwürfe bearbeiten" on anforderung for update to authenticated
  using (ersteller_id = auth.uid() and status in ('entwurf', 'abgelehnt'))
  with check (ersteller_id = auth.uid());
create policy "eigene Entwürfe löschen" on anforderung for delete to authenticated
  using (ersteller_id = auth.uid() and status = 'entwurf');

create policy "Verlauf lesen wie Anforderung" on anforderung_ereignis for select to authenticated
  using (exists (select 1 from anforderung a where a.id = anforderung_id
                 and darf_anforderung_sehen(a.ersteller_id, a.team_id)));

-- Workflow-Felder sind nur über die Workflow-Funktionen (security definer) änderbar
create function anforderung_workflow_schuetzen() returns trigger
  language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;

  if tg_op = 'INSERT' then
    if new.status <> 'entwurf' or new.ausserplanmaessig or new.eingereicht_am is not null
       or new.teamleitung_von is not null or new.teamleitung_am is not null
       or new.gf_von is not null or new.gf_am is not null or new.ablehnungsgrund is not null
       or new.bestellt_von is not null or new.bestellt_am is not null or new.bestellnummer is not null then
      raise exception 'Workflow-Felder dürfen nicht direkt gesetzt werden';
    end if;
  elsif (new.status, new.ausserplanmaessig, new.eingereicht_am, new.teamleitung_von, new.teamleitung_am,
         new.gf_von, new.gf_am, new.ablehnungsgrund, new.bestellt_von, new.bestellt_am, new.bestellnummer,
         new.ersteller_id)
        is distinct from
        (old.status, old.ausserplanmaessig, old.eingereicht_am, old.teamleitung_von, old.teamleitung_am,
         old.gf_von, old.gf_am, old.ablehnungsgrund, old.bestellt_von, old.bestellt_am, old.bestellnummer,
         old.ersteller_id) then
    raise exception 'Workflow-Felder dürfen nicht direkt geändert werden';
  end if;
  return new;
end;
$$;

create trigger anforderung_workflow_schuetzen
  before insert or update on anforderung
  for each row execute function anforderung_workflow_schuetzen();

-- ---------------------------------------------------------------------------
-- Budgetstand
-- ---------------------------------------------------------------------------

-- Gebunden = freigegebene und bestellte Anforderungen (später zusätzlich: abgerechnet → ausgegeben)
create function gebunden_cent(p_budgetposten uuid, p_ohne uuid default null) returns bigint
  language sql stable security definer set search_path = public as $$
  select coalesce(sum(betrag_cent), 0) from anforderung
   where budgetposten_id = p_budgetposten and status in ('freigegeben', 'bestellt')
     and id is distinct from p_ohne;
$$;

-- Budgetstand einer Periode je Budgetposten, nur für sichtbare Teams.
-- Außerplanmäßige Anforderungen ohne Budgetposten erscheinen je Team als Zeile ohne budgetposten_id.
create function budget_stand(p_periode uuid)
  returns table (
    team_id uuid,
    budgetposten_id uuid,
    name text,
    key_result_id uuid,
    geplant_cent bigint,
    in_freigabe_cent bigint,
    gebunden_cent bigint,
    verfuegbar_cent bigint
  )
  language sql stable security definer set search_path = public as $$
  with summen as (
    select a.team_id, a.budgetposten_id,
           sum(a.betrag_cent) filter (where a.status in ('bei_teamleitung', 'bei_gf')) as in_freigabe,
           sum(a.betrag_cent) filter (where a.status in ('freigegeben', 'bestellt')) as gebunden
      from anforderung a
     where a.periode_id = p_periode
     group by a.team_id, a.budgetposten_id
  )
  select b.team_id, b.id, b.name, b.key_result_id, b.geplant_cent::bigint,
         coalesce(s.in_freigabe, 0), coalesce(s.gebunden, 0),
         b.geplant_cent - coalesce(s.gebunden, 0)
    from budgetposten b
    left join summen s on s.budgetposten_id = b.id
   where b.periode_id = p_periode and darf_team_sehen(b.team_id)
  union all
  select s.team_id, null, 'Außerplanmäßig', null, 0,
         coalesce(s.in_freigabe, 0), coalesce(s.gebunden, 0), -coalesce(s.gebunden, 0)
    from summen s
   where s.budgetposten_id is null and darf_team_sehen(s.team_id)
     and (coalesce(s.in_freigabe, 0) + coalesce(s.gebunden, 0)) > 0
   order by 1, 3;
$$;

-- ---------------------------------------------------------------------------
-- Workflow
--   entwurf/abgelehnt → bei_teamleitung (bzw. direkt bei_gf, wenn die Teamleitung selbst
--     anfordert oder das Team keine Leitung hat)
--   bei_teamleitung → freigegeben, oder bei_gf wenn > GF-Grenze oder außerplanmäßig
--   bei_gf → freigegeben
--   freigegeben → bestellt (Einkauf)
--   bei_teamleitung/bei_gf → abgelehnt | entwurf (zurückgezogen)
-- Die GF darf auch im Schritt der Teamleitung entscheiden. Niemand gibt eigene Anforderungen frei.
-- ---------------------------------------------------------------------------

create function anforderung_holen(p_id uuid) returns anforderung
  language plpgsql security definer set search_path = public as $$
declare a anforderung;
begin
  select * into a from anforderung where id = p_id for update;
  if not found then raise exception 'Anforderung nicht gefunden'; end if;
  return a;
end;
$$;

-- Ohne Budgetposten oder über dem noch verfügbaren Budget (andere freigegebene/bestellte abgezogen)
create function ist_ausserplanmaessig(a anforderung) returns boolean
  language sql stable security definer set search_path = public as $$
  select a.budgetposten_id is null
      or a.betrag_cent > (select b.geplant_cent from budgetposten b where b.id = a.budgetposten_id)
                         - gebunden_cent(a.budgetposten_id, a.id);
$$;

create function braucht_gf(a anforderung) returns boolean
  language sql stable security definer set search_path = public as $$
  select a.betrag_cent > (select gf_grenze_cent from einstellungen) or ist_ausserplanmaessig(a);
$$;

create function darf_freigeben(a anforderung) returns boolean
  language sql stable security definer set search_path = public as $$
  select auth.uid() <> a.ersteller_id
     and ((a.status = 'bei_teamleitung' and (ist_teamleitung(a.team_id) or ist_gf()))
       or (a.status = 'bei_gf' and ist_gf()));
$$;

create function anforderung_einreichen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare a anforderung; leitung uuid;
begin
  a := anforderung_holen(p_id);
  if a.ersteller_id <> auth.uid() then raise exception 'Nur die anfordernde Person kann einreichen'; end if;
  if a.status not in ('entwurf', 'abgelehnt') then raise exception 'Anforderung wurde bereits eingereicht'; end if;
  if (select status from periode where id = a.periode_id) <> 'aktiv' then
    raise exception 'Die Periode ist nicht aktiv';
  end if;
  select leitung_id into leitung from team where id = a.team_id;

  update anforderung set
    status = case when leitung is null or leitung = auth.uid() then 'bei_gf' else 'bei_teamleitung' end::anforderung_status,
    ausserplanmaessig = ist_ausserplanmaessig(a),
    eingereicht_am = now(), ablehnungsgrund = null,
    teamleitung_von = null, teamleitung_am = null, gf_von = null, gf_am = null
   where id = p_id;
  insert into anforderung_ereignis (anforderung_id, person_id, aktion) values (p_id, auth.uid(), 'eingereicht');
end;
$$;

create function anforderung_zurueckziehen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare a anforderung;
begin
  a := anforderung_holen(p_id);
  if a.ersteller_id <> auth.uid() then raise exception 'Nur die anfordernde Person kann zurückziehen'; end if;
  if a.status not in ('bei_teamleitung', 'bei_gf') then raise exception 'Anforderung ist nicht in Freigabe'; end if;
  update anforderung set status = 'entwurf', eingereicht_am = null,
    teamleitung_von = null, teamleitung_am = null, gf_von = null, gf_am = null
   where id = p_id;
  insert into anforderung_ereignis (anforderung_id, person_id, aktion) values (p_id, auth.uid(), 'zurueckgezogen');
end;
$$;

create function anforderung_freigeben(p_id uuid, p_kommentar text default null) returns anforderung_status
  language plpgsql security definer set search_path = public as $$
declare a anforderung; neu anforderung_status;
begin
  a := anforderung_holen(p_id);
  if a.status not in ('bei_teamleitung', 'bei_gf') then raise exception 'Anforderung wartet nicht auf Freigabe'; end if;
  if not darf_freigeben(a) then raise exception 'Keine Berechtigung zur Freigabe'; end if;

  if ist_gf() then
    neu := 'freigegeben';
    update anforderung set status = neu, gf_von = auth.uid(), gf_am = now(),
      ausserplanmaessig = ist_ausserplanmaessig(a)
     where id = p_id;
  else
    neu := case when braucht_gf(a) then 'bei_gf' else 'freigegeben' end;
    update anforderung set status = neu, teamleitung_von = auth.uid(), teamleitung_am = now(),
      ausserplanmaessig = ist_ausserplanmaessig(a)
     where id = p_id;
  end if;

  insert into anforderung_ereignis (anforderung_id, person_id, aktion, kommentar)
  values (p_id, auth.uid(), 'freigegeben', nullif(trim(p_kommentar), ''));
  return neu;
end;
$$;

create function anforderung_ablehnen(p_id uuid, p_grund text) returns void
  language plpgsql security definer set search_path = public as $$
declare a anforderung;
begin
  a := anforderung_holen(p_id);
  if coalesce(trim(p_grund), '') = '' then raise exception 'Bitte einen Grund angeben'; end if;
  if not darf_freigeben(a) then raise exception 'Keine Berechtigung zur Ablehnung'; end if;
  update anforderung set status = 'abgelehnt', ablehnungsgrund = trim(p_grund) where id = p_id;
  insert into anforderung_ereignis (anforderung_id, person_id, aktion, kommentar)
  values (p_id, auth.uid(), 'abgelehnt', trim(p_grund));
end;
$$;

create function anforderung_bestellen(p_id uuid, p_bestellnummer text default null) returns void
  language plpgsql security definer set search_path = public as $$
declare a anforderung;
begin
  a := anforderung_holen(p_id);
  if a.status <> 'freigegeben' then raise exception 'Anforderung ist nicht freigegeben'; end if;
  if not ist_einkauf() then raise exception 'Nur der Einkauf kann bestellen'; end if;
  update anforderung set status = 'bestellt', bestellt_von = auth.uid(), bestellt_am = now(),
    bestellnummer = nullif(trim(p_bestellnummer), '')
   where id = p_id;
  insert into anforderung_ereignis (anforderung_id, person_id, aktion, kommentar)
  values (p_id, auth.uid(), 'bestellt', nullif(trim(p_bestellnummer), ''));
end;
$$;

-- Interne Hilfsfunktionen nicht direkt aufrufbar machen
revoke execute on function anforderung_holen(uuid) from public, anon, authenticated;
revoke execute on function gebunden_cent(uuid, uuid) from public, anon, authenticated;
revoke execute on function profil_anlegen() from public, anon, authenticated;
revoke execute on function profil_name_aktualisieren() from public, anon, authenticated;
