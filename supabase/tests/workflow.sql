-- Tests für Berechtigungen, Workflow und Budgetstand (npm run test:db).
-- Läuft nach supabase-stub.sql und allen Migrationen; bricht beim ersten Fehler ab.

\set ON_ERROR_STOP on
\set QUIET on

create schema test;
grant usage on schema test to authenticated;

-- Als Person handeln (wie ein eingeloggter Supabase-Request)
create function test.als(p_email text) returns void
  language plpgsql security definer as $$
begin
  perform set_config('request.jwt.claim.sub', (select id::text from auth.users where email = p_email), false);
end;
$$;

create function test.pruefe(p_bedingung boolean, p_text text) returns void
  language plpgsql as $$
begin
  if p_bedingung is distinct from true then raise exception 'FEHLGESCHLAGEN: %', p_text; end if;
end;
$$;

create function test.erwarte_fehler(p_sql text, p_muster text) returns void
  language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm ilike '%' || p_muster || '%' then return; end if;
    raise exception 'FEHLGESCHLAGEN: "%" scheiterte mit "%", erwartet "%"', p_sql, sqlerrm, p_muster;
  end;
  raise exception 'FEHLGESCHLAGEN: "%" hätte scheitern müssen (%)', p_sql, p_muster;
end;
$$;

create function test.anforderung(p_titel text) returns uuid
  language sql as $$ select id from public.anforderung where titel = p_titel; $$;

-- Budgetposten unabhängig von der eigenen Sichtbarkeit (um Fremdzugriffe zu testen)
create function test.posten(p_name text) returns uuid
  language sql security definer as $$ select id from public.budgetposten where name = p_name; $$;

create function test.status(p_titel text) returns text
  language sql security definer as $$ select status::text from public.anforderung where titel = p_titel; $$;

grant execute on all functions in schema test to authenticated;

-- ---------------------------------------------------------------------------
-- Personen: die erste wird Admin
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  (gen_random_uuid(), 'admin@test', '{"full_name": "Ada Admin"}'),
  (gen_random_uuid(), 'tl@test', '{"full_name": "Tim Teamleitung"}'),
  (gen_random_uuid(), 'ma@test', '{}'),
  (gen_random_uuid(), 'gf@test', '{}'),
  (gen_random_uuid(), 'gf2@test', '{}'),
  (gen_random_uuid(), 'ek@test', '{}'),
  (gen_random_uuid(), 'prod@test', '{}');

select test.pruefe((select ist_admin from profile where email = 'admin@test'), 'erste Person ist Admin');
select test.pruefe((select count(*) = 1 from profile where ist_admin), 'nur die erste Person ist Admin');
select test.pruefe((select name from profile where email = 'tl@test') = 'Tim Teamleitung', 'Name aus Microsoft');
select test.pruefe((select name from profile where email = 'ma@test') = 'ma', 'Ersatzname aus E-Mail');

set role authenticated;

-- Nicht-Admins können Rollen nicht ändern (Update trifft keine Zeile)
select test.als('ma@test');
update profile set ist_gf = true where email = 'ma@test';
select test.pruefe(not (select ist_gf from profile where email = 'ma@test'), 'Mitarbeiter macht sich nicht zur GF');

-- Admin richtet Teams und Rollen ein, legt Periode und Budget an
select test.als('admin@test');
update profile set team_id = (select id from team where name = 'Material') where email in ('tl@test', 'ma@test');
update profile set team_id = (select id from team where name = 'Produktion') where email = 'prod@test';
update profile set ist_gf = true where email in ('gf@test', 'gf2@test');
update profile set ist_einkauf = true where email = 'ek@test';
update team set leitung_id = (select id from profile where email = 'tl@test') where name = 'Material';

insert into periode (name, beginn, ende, status) values ('Q4 2026', '2026-10-01', '2026-12-31', 'aktiv');
insert into budgetposten (periode_id, team_id, name, geplant_cent)
select p.id, t.id, 'Laborbedarf', 200000 from periode p, team t where t.name = 'Material';
insert into budgetposten (periode_id, team_id, name, geplant_cent)
select p.id, t.id, 'Werkzeug', 50000 from periode p, team t where t.name = 'Produktion';

-- ---------------------------------------------------------------------------
-- Sichtbarkeit Budget
-- ---------------------------------------------------------------------------
select test.als('ma@test');
select test.pruefe((select count(*) = 1 from budgetposten), 'Mitarbeiter sieht nur Budget des eigenen Teams');
select test.als('gf@test');
select test.pruefe((select count(*) = 2 from budgetposten), 'GF sieht alle Budgets');

-- Teamleitung darf in aktiver Periode nicht am Budget drehen
select test.als('tl@test');
update budgetposten set geplant_cent = 9999999 where name = 'Laborbedarf';
select test.pruefe((select geplant_cent from budgetposten where name = 'Laborbedarf') = 200000,
                   'Teamleitung ändert Budget nicht in aktiver Periode');

-- ---------------------------------------------------------------------------
-- Anforderung unter 1.000 € → nur Teamleitung
-- ---------------------------------------------------------------------------
select test.als('ma@test');
insert into anforderung (ersteller_id, periode_id, team_id, budgetposten_id, titel, betrag_cent)
select auth.uid(), b.periode_id, b.team_id, b.id, 'Pipetten', 50000 from budgetposten b where b.name = 'Laborbedarf';

select test.erwarte_fehler($$update anforderung set status = 'freigegeben' where titel = 'Pipetten'$$, 'Workflow-Felder');
select test.erwarte_fehler($$insert into anforderung (ersteller_id, periode_id, team_id, titel, betrag_cent, status)
  select auth.uid(), periode_id, team_id, 'Trick', 100, 'freigegeben' from anforderung limit 1$$, 'Workflow-Felder');
select test.erwarte_fehler($$insert into anforderung (ersteller_id, periode_id, team_id, budgetposten_id, titel, betrag_cent)
  select auth.uid(), a.periode_id, a.team_id, test.posten('Werkzeug'), 'Fremdes Budget', 100
  from anforderung a limit 1$$, 'foreign key');

select anforderung_einreichen(test.anforderung('Pipetten'));
select test.pruefe(test.status('Pipetten') = 'bei_teamleitung', 'eingereicht → Teamleitung');
select test.erwarte_fehler($$select anforderung_freigeben(test.anforderung('Pipetten'))$$, 'Keine Berechtigung');

select test.als('prod@test');
select test.pruefe(test.anforderung('Pipetten') is null, 'anderes Team sieht Anforderung nicht');

select test.als('ek@test');
select test.erwarte_fehler($$select anforderung_bestellen(test.anforderung('Pipetten'))$$, 'nicht freigegeben');

select test.als('tl@test');
select test.erwarte_fehler($$select anforderung_ablehnen(test.anforderung('Pipetten'), ' ')$$, 'Grund');
select test.pruefe(anforderung_freigeben(test.anforderung('Pipetten')) = 'freigegeben', 'Teamleitung gibt unter Grenze frei');

-- ---------------------------------------------------------------------------
-- Über 1.000 € → Teamleitung, dann GF
-- ---------------------------------------------------------------------------
select test.als('ma@test');
insert into anforderung (ersteller_id, periode_id, team_id, budgetposten_id, titel, betrag_cent)
select auth.uid(), b.periode_id, b.team_id, b.id, 'Waage', 120000 from budgetposten b where b.name = 'Laborbedarf';
select anforderung_einreichen(test.anforderung('Waage'));

select test.als('tl@test');
select test.pruefe(anforderung_freigeben(test.anforderung('Waage')) = 'bei_gf', 'über 1.000 € → GF');
select test.erwarte_fehler($$select anforderung_freigeben(test.anforderung('Waage'))$$, 'Keine Berechtigung');

select test.als('gf@test');
select test.pruefe(anforderung_freigeben(test.anforderung('Waage'), 'ok') = 'freigegeben', 'GF gibt frei');

-- Genau 1.000 € braucht keine GF
select test.als('ma@test');
insert into anforderung (ersteller_id, periode_id, team_id, budgetposten_id, titel, betrag_cent)
select auth.uid(), b.periode_id, b.team_id, b.id, 'Genau tausend', 100000 from budgetposten b where b.name = 'Laborbedarf';
select anforderung_einreichen(test.anforderung('Genau tausend'));
select anforderung_zurueckziehen(test.anforderung('Genau tausend'));
select test.pruefe(test.status('Genau tausend') = 'entwurf', 'zurückgezogen → Entwurf');
delete from anforderung where titel = 'Genau tausend';

-- ---------------------------------------------------------------------------
-- Budget erschöpft → außerplanmäßig → GF
-- ---------------------------------------------------------------------------
select test.pruefe((select verfuegbar_cent from budget_stand((select id from periode)) where name = 'Laborbedarf') = 30000,
                   'verfügbar = 2.000 − 500 − 1.200');
insert into anforderung (ersteller_id, periode_id, team_id, budgetposten_id, titel, betrag_cent)
select auth.uid(), b.periode_id, b.team_id, b.id, 'Mikroskop', 40000 from budgetposten b where b.name = 'Laborbedarf';
select anforderung_einreichen(test.anforderung('Mikroskop'));
select test.pruefe((select ausserplanmaessig from anforderung where titel = 'Mikroskop'), 'über Budget = außerplanmäßig');
select test.pruefe((select in_freigabe_cent from budget_stand((select id from periode)) where name = 'Laborbedarf') = 40000,
                   'in Freigabe');

select test.als('tl@test');
select test.pruefe(anforderung_freigeben(test.anforderung('Mikroskop')) = 'bei_gf', 'außerplanmäßig → GF');
select test.als('gf@test');
select anforderung_ablehnen(test.anforderung('Mikroskop'), 'Bitte nächstes Quartal');

-- Abgelehnt: bearbeiten und neu einreichen
select test.als('ma@test');
update anforderung set betrag_cent = 30000 where titel = 'Mikroskop';
select anforderung_einreichen(test.anforderung('Mikroskop'));
select test.pruefe((select not ausserplanmaessig and ablehnungsgrund is null from anforderung where titel = 'Mikroskop'),
                   'nach Korrektur im Budget');
select test.als('tl@test');
select test.pruefe(anforderung_freigeben(test.anforderung('Mikroskop')) = 'freigegeben', 'jetzt reicht Teamleitung');

-- Ohne Budgetposten → außerplanmäßig
select test.als('ma@test');
insert into anforderung (ersteller_id, periode_id, team_id, titel, betrag_cent)
select auth.uid(), p.id, t.id, 'Messestand', 20000 from periode p, team t where t.name = 'Material';
select anforderung_einreichen(test.anforderung('Messestand'));
select test.als('tl@test');
select test.pruefe(anforderung_freigeben(test.anforderung('Messestand')) = 'bei_gf', 'ohne Budgetposten → GF');
select test.pruefe((select in_freigabe_cent from budget_stand((select id from periode)) where budgetposten_id is null) = 20000,
                   'außerplanmäßige Zeile im Budgetstand');

-- ---------------------------------------------------------------------------
-- Eigene Anforderungen der Teamleitung und der GF
-- ---------------------------------------------------------------------------
insert into anforderung (ersteller_id, periode_id, team_id, budgetposten_id, titel, betrag_cent)
select auth.uid(), b.periode_id, b.team_id, b.id, 'Laptop TL', 10000 from budgetposten b where b.name = 'Laborbedarf';
select anforderung_einreichen(test.anforderung('Laptop TL'));
select test.pruefe(test.status('Laptop TL') = 'bei_gf', 'Teamleitung reicht ein → direkt GF');

select test.als('gf@test');
insert into anforderung (ersteller_id, periode_id, team_id, budgetposten_id, titel, betrag_cent)
select auth.uid(), b.periode_id, b.team_id, b.id, 'GF-Wunsch', 10000 from budgetposten b where b.name = 'Werkzeug';
select anforderung_einreichen(test.anforderung('GF-Wunsch'));
select test.pruefe(test.status('GF-Wunsch') = 'bei_gf', 'Team ohne Leitung → GF');
select test.erwarte_fehler($$select anforderung_freigeben(test.anforderung('GF-Wunsch'))$$, 'Keine Berechtigung');
select test.als('gf2@test');
select test.pruefe(anforderung_freigeben(test.anforderung('GF-Wunsch')) = 'freigegeben', 'zweite GF gibt frei');

-- ---------------------------------------------------------------------------
-- Einkauf bestellt
-- ---------------------------------------------------------------------------
select test.als('ma@test');
select test.erwarte_fehler($$select anforderung_bestellen(test.anforderung('Pipetten'))$$, 'Nur der Einkauf');
select test.als('ek@test');
select anforderung_bestellen(test.anforderung('Pipetten'), 'PO-4711');
select test.pruefe(test.status('Pipetten') = 'bestellt', 'bestellt');
select test.pruefe((select array_agg(aktion order by id) from anforderung_ereignis
                     where anforderung_id = test.anforderung('Pipetten')) = array['eingereicht', 'freigegeben', 'bestellt'],
                   'Verlauf Pipetten');

-- Budgetstand je Sicht
select test.pruefe((select gebunden_cent from budget_stand((select id from periode)) where name = 'Laborbedarf') = 200000,
                   'gebunden = 500 + 1.200 + 300');
select test.als('prod@test');
select test.pruefe((select count(*) = 1 from budget_stand((select id from periode))), 'Produktion sieht nur eigenes Budget');
select test.erwarte_fehler($$select gebunden_cent(null)$$, 'permission denied');

-- Löschen nur im Entwurf
select test.als('ma@test');
delete from anforderung where titel = 'Pipetten';
select test.pruefe(test.anforderung('Pipetten') is not null, 'bestellte Anforderung bleibt');

-- ---------------------------------------------------------------------------
-- Mail-Empfänger
-- ---------------------------------------------------------------------------
reset role;
create function test.empfaenger(p_titel text, p_anlass text) returns text
  language sql as $$
  select coalesce(string_agg(email, ',' order by email), '') from mail_empfaenger(test.anforderung(p_titel), p_anlass);
$$;
grant execute on function test.empfaenger(text, text) to authenticated;
set role authenticated;

select test.als('ma@test');
insert into anforderung (ersteller_id, periode_id, team_id, budgetposten_id, titel, betrag_cent)
select auth.uid(), b.periode_id, b.team_id, b.id, 'Handschuhe', 1000 from budgetposten b where b.name = 'Laborbedarf';
select anforderung_einreichen(test.anforderung('Handschuhe'));
select test.pruefe(test.empfaenger('Handschuhe', 'zur_freigabe') = 'tl@test', 'Mail an Teamleitung');
select test.pruefe(test.empfaenger('Laptop TL', 'zur_freigabe') = '', 'fremde Anforderung: keine Empfänger');

select test.als('tl@test');
select test.pruefe(test.empfaenger('Messestand', 'zur_freigabe') = 'gf2@test,gf@test', 'Mail an alle GF');
select test.pruefe(test.empfaenger('Laptop TL', 'zur_freigabe') = 'gf2@test,gf@test', 'eigene Anforderung der Teamleitung → GF');
select test.pruefe(test.empfaenger('Waage', 'zum_bestellen') = 'ek@test', 'Mail an Einkauf');
select test.pruefe(test.empfaenger('Handschuhe', 'zum_bestellen') = '', 'noch nicht freigegeben: kein Einkauf');
select test.pruefe(test.empfaenger('Pipetten', 'bestellt') = 'ma@test', 'Mail an anfordernde Person');

select test.als('gf2@test');
select test.pruefe(test.empfaenger('GF-Wunsch', 'zur_freigabe') = '', 'GF-Wunsch ist schon freigegeben');

select test.als('prod@test');
select test.pruefe(test.empfaenger('Pipetten', 'bestellt') = '', 'anderes Team bekommt keine Empfänger');
select mail_protokollieren(null, 'test', array['x@test'], 'Betreff', 'gesendet', '');
select test.pruefe((select count(*) = 0 from mail_protokoll), 'Protokoll nur für Admins lesbar');
select test.als('admin@test');
select test.pruefe((select count(*) = 1 from mail_protokoll), 'Admin liest Protokoll');

reset role;
\echo 'Alle Datenbanktests bestanden.'
