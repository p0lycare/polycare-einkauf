-- Tests für „Vorperiode kopieren“ (npm run test:db). Läuft nach workflow.sql in derselben Datenbank.

\set ON_ERROR_STOP on
\set QUIET on

create function test.periode(p_name text) returns uuid
  language sql as $$ select id from public.periode where name = p_name; $$;
grant execute on function test.periode(text) to authenticated;

set role authenticated;

-- Vorperiode Q4 2026 bekommt ein Key Result, an dem ein Budgetposten hängt
select test.als('admin@test');
insert into key_result (periode_id, team_id, kuerzel, titel)
select p.id, t.id, 'KR 1.1', 'Labor modernisieren' from periode p, team t where p.name = 'Q4 2026' and t.name = 'Material';
update budgetposten set key_result_id = (select id from key_result where kuerzel = 'KR 1.1') where name = 'Laborbedarf';

insert into periode (name, beginn, ende, status) values ('Q1 2027', '2027-01-01', '2027-03-31', 'planung');
insert into periode (name, beginn, ende, status) values ('Q2 2027', '2027-04-01', '2027-06-30', 'aktiv');

-- Nur Finanzen und Admins, nur in eine Periode in Planung
select test.als('tl@test');
select test.erwarte_fehler($$select periode_kopieren(test.periode('Q4 2026'), test.periode('Q1 2027'))$$, 'Keine Berechtigung');
select test.als('admin@test');
select test.erwarte_fehler($$select periode_kopieren(test.periode('Q4 2026'), test.periode('Q2 2027'))$$, 'in Planung');
select test.erwarte_fehler($$select periode_kopieren(test.periode('Q1 2027'), test.periode('Q1 2027'))$$, 'dieselbe');

-- Kopieren übernimmt alles, mit Beträgen und auf das neue Key Result umgehängt
select test.pruefe(
  (select (kopierte_key_results, kopierte_posten) = (1, 2) from periode_kopieren(test.periode('Q4 2026'), test.periode('Q1 2027'))),
  'ein Key Result und zwei Budgetposten kopiert');
select test.pruefe(
  (select b.geplant_cent = 200000 and k.periode_id = test.periode('Q1 2027')
     from budgetposten b join key_result k on k.id = b.key_result_id
    where b.name = 'Laborbedarf' and b.periode_id = test.periode('Q1 2027')),
  'Budgetposten zeigt auf das Key Result der neuen Periode');
select test.pruefe((select count(*) = 2 from budgetposten where periode_id = test.periode('Q4 2026')), 'Vorperiode bleibt unverändert');

-- Zweites Kopieren lässt Vorhandenes (auch geänderte Beträge) in Ruhe
update budgetposten set geplant_cent = 123400 where name = 'Werkzeug' and periode_id = test.periode('Q1 2027');
select test.pruefe(
  (select (kopierte_key_results, kopierte_posten) = (0, 0) from periode_kopieren(test.periode('Q4 2026'), test.periode('Q1 2027'))),
  'doppeltes Kopieren übernimmt nichts');
select test.pruefe(
  (select geplant_cent = 123400 from budgetposten where name = 'Werkzeug' and periode_id = test.periode('Q1 2027')),
  'geänderter Betrag bleibt erhalten');

reset role;
\echo 'Tests für Vorperiode kopieren bestanden.'
