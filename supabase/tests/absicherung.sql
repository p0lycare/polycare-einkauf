-- Tests für die Absicherung aus Migration 0006 (npm run test:db). Läuft nach workflow.sql.

\set ON_ERROR_STOP on
\set QUIET on

-- Nur Microsoft-Konten bekommen ein Profil; eine E-Mail-Registrierung scheitert
select test.erwarte_fehler($$insert into auth.users (id, email, raw_app_meta_data)
  values (gen_random_uuid(), 'fremd@example.com', '{"provider": "email"}')$$, 'Microsoft-Konto');
select test.pruefe((select count(*) = 0 from profile where email = 'fremd@example.com'), 'kein Profil für E-Mail-Registrierung');

-- Neue Microsoft-Konten werden nicht Admin, auch wenn es Admins schon gibt
insert into auth.users (id, email) values (gen_random_uuid(), 'neu@test');
select test.pruefe(not (select ist_admin from profile where email = 'neu@test'), 'neue Person wird nicht Admin');

-- Interne Funktionen: anon darf nichts protokollieren, niemand rechnet Budgets fremder Posten aus
set role anon;
select test.erwarte_fehler($$select mail_protokollieren(null, 'x', '{}', 'x', 'gesendet', '')$$, 'permission denied');
set role authenticated;
select test.als('ma@test');
select test.erwarte_fehler($$select braucht_gf(a) from anforderung a limit 1$$, 'permission denied');
select test.erwarte_fehler($$select ist_ausserplanmaessig(a) from anforderung a limit 1$$, 'permission denied');

-- Der letzte Admin kann sich die Rolle nicht nehmen; gibt es einen zweiten, geht es
select test.als('admin@test');
select test.erwarte_fehler($$update profile set ist_admin = false where email = 'admin@test'$$, 'Admin bleiben');
update profile set ist_admin = true where email = 'gf@test';
update profile set ist_admin = false where email = 'admin@test';
select test.pruefe(not (select ist_admin from profile where email = 'admin@test'), 'mit zweitem Admin abgebbar');
select test.als('gf@test');
update profile set ist_admin = true where email = 'admin@test';
update profile set ist_admin = false where email = 'gf@test';

-- Keine Freigabe in einer abgeschlossenen Periode
select test.als('admin@test');
insert into periode (name, beginn, ende, status) values ('Alt', '2025-01-01', '2025-04-30', 'aktiv');
select test.als('ma@test');
insert into anforderung (ersteller_id, periode_id, team_id, titel, betrag_cent)
select auth.uid(), p.id, t.id, 'Spät dran', 2000 from periode p, team t where p.name = 'Alt' and t.name = 'Material';
select anforderung_einreichen(test.anforderung('Spät dran'));
select test.als('admin@test');
update periode set status = 'abgeschlossen' where name = 'Alt';
select test.als('tl@test');
select test.erwarte_fehler($$select anforderung_freigeben(test.anforderung('Spät dran'))$$, 'abgeschlossen');

-- Links nur http(s), auch an der App vorbei
select test.als('ma@test');
select test.erwarte_fehler($$insert into anforderung (ersteller_id, periode_id, team_id, titel, betrag_cent, link)
  select auth.uid(), p.id, t.id, 'Böser Link', 100, 'javascript:alert(1)'
  from periode p, team t where p.name = 'Q4 2026' and t.name = 'Material'$$, 'link_nur_http');

reset role;
\echo 'Tests für die Absicherung bestanden.'
