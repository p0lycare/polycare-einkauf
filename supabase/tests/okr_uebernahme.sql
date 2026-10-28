-- Tests für die Übernahme aus dem OKR-Dashboard (npm run test:db). Läuft nach workflow.sql.

\set ON_ERROR_STOP on
\set QUIET on

create function test.okr_periode() returns uuid
  language sql as $$ select id from public.periode where okr_zyklus = '26Z3'; $$;
grant execute on function test.okr_periode() to authenticated;

set role authenticated;

-- Nur Finanzen und Admins
select test.als('tl@test');
select test.erwarte_fehler($$select okr_uebernehmen('{"zyklus": {"kuerzel": "26Z3"}, "version": {"nummer": 1}, "key_results": []}')$$, 'Keine Berechtigung');

-- Erste Übernahme: Periode in Planung, Team-KRs, Budgetposten nur bei bekanntem Team und Vorschlag
select test.als('admin@test');
select test.pruefe(
  (select (e->>'neu')::int = 3 and (e->>'budgetposten')::int = 1 and e->'unbekannte_teams' = '["Vertrieb"]'::jsonb
     from okr_uebernehmen('{
       "zyklus": {"kuerzel": "26Z3", "beginn": "2026-09-01", "ende": "2026-12-31", "status": "aktiv"},
       "version": {"nummer": 1, "eingefroren_am": "2026-10-01T10:00:00Z", "begruendung": null},
       "objective": "Ziel",
       "key_results": [
         {"id": "top1", "ebene": "top", "kuerzel": "KR1", "titel": "Referenz", "team": "Material", "budget_vorschlag_cent": 2100000},
         {"id": "a", "ebene": "team", "kuerzel": "KR 1.1", "titel": "Labor bereit", "team": "material", "top_kr": "KR1", "budget_vorschlag_cent": 500000},
         {"id": "b", "ebene": "team", "kuerzel": "KR 1.2", "titel": "Linie läuft", "team": "Produktion", "top_kr": "KR1", "budget_vorschlag_cent": null},
         {"id": "c", "ebene": "team", "kuerzel": "KR 2.1", "titel": "Messe", "team": "Vertrieb", "top_kr": "KR2", "budget_vorschlag_cent": 100000}
       ]}'::jsonb) e),
  'erste Übernahme meldet 3 neue KRs, 1 Budgetposten, unbekanntes Team');

select test.pruefe((select status = 'planung' and okr_version = 1 and name = '26Z3' from periode where okr_zyklus = '26Z3'), 'Periode in Planung angelegt');
select test.pruefe((select count(*) = 3 from key_result where periode_id = test.okr_periode()), 'nur Team-KRs übernommen');
select test.pruefe((select team_id is null from key_result where okr_id = 'c'), 'unbekanntes Team wird nicht geraten');
select test.pruefe(
  (select b.geplant_cent = 500000 and b.team_id = (select id from team where name = 'Material')
     from budgetposten b join key_result k on k.id = b.key_result_id where k.okr_id = 'a'),
  'Budgetvorschlag belegt Posten des Teams vor');

-- Neue Version: Titel und Vorschlag geändert, ein KR entfällt, eins kommt dazu; geplante Posten bleiben
update budgetposten set geplant_cent = 450000 where key_result_id = (select id from key_result where okr_id = 'a');
select test.pruefe(
  (select (e->>'neu')::int = 1 and (e->>'entfallen')::int = 1 and (e->>'budgetposten')::int = 1
     from okr_uebernehmen('{
       "zyklus": {"kuerzel": "26z3", "beginn": "2026-09-01", "ende": "2026-12-31", "status": "aktiv"},
       "version": {"nummer": 2, "eingefroren_am": "2026-10-20T10:00:00Z", "begruendung": "Review"},
       "key_results": [
         {"id": "a", "ebene": "team", "kuerzel": "KR 1.1", "titel": "Labor voll bereit", "team": "Material", "budget_vorschlag_cent": 700000},
         {"id": "c", "ebene": "team", "kuerzel": "KR 2.1", "titel": "Messe", "team": "Vertrieb", "budget_vorschlag_cent": 100000},
         {"id": "d", "ebene": "team", "kuerzel": "KR 1.3", "titel": "Prüfstand", "team": "Material", "budget_vorschlag_cent": 200000}
       ]}'::jsonb) e),
  'neue Version: 1 neu, 1 entfallen, 1 neuer Posten');
select test.pruefe((select titel = 'Labor voll bereit' and okr_budget_vorschlag_cent = 700000 from key_result where okr_id = 'a'), 'KR aktualisiert');
select test.pruefe(
  (select geplant_cent = 450000 from budgetposten where key_result_id = (select id from key_result where okr_id = 'a')),
  'geplanter Posten wird nicht überschrieben');
select test.pruefe((select okr_entfallen from key_result where okr_id = 'b'), 'fehlendes KR bleibt, als entfallen markiert');
select test.pruefe((select okr_version = 2 from periode where id = test.okr_periode()), 'Version gemerkt');

-- Nochmal dasselbe: nichts Neues
select test.pruefe(
  (select (e->>'neu')::int = 0 and (e->>'budgetposten')::int = 0 and (e->>'entfallen')::int = 0
     from okr_uebernehmen('{
       "zyklus": {"kuerzel": "26Z3", "beginn": "2026-09-01", "ende": "2026-12-31", "status": "aktiv"},
       "version": {"nummer": 2, "eingefroren_am": "2026-10-20T10:00:00Z", "begruendung": "Review"},
       "key_results": [
         {"id": "a", "ebene": "team", "kuerzel": "KR 1.1", "titel": "Labor voll bereit", "team": "Material", "budget_vorschlag_cent": 700000},
         {"id": "c", "ebene": "team", "kuerzel": "KR 2.1", "titel": "Messe", "team": "Vertrieb", "budget_vorschlag_cent": 100000},
         {"id": "d", "ebene": "team", "kuerzel": "KR 1.3", "titel": "Prüfstand", "team": "Material", "budget_vorschlag_cent": 200000}
       ]}'::jsonb) e),
  'erneute Übernahme ist unschädlich');

-- Von Hand angelegte Periode und KR mit gleichem Kürzel werden verknüpft statt verdoppelt
insert into periode (name, beginn, ende, status) values ('27Z1', '2027-01-01', '2027-04-30', 'planung');
insert into key_result (periode_id, kuerzel, titel) select id, 'KR 9.1', 'Von Hand' from periode where name = '27Z1';
select okr_uebernehmen('{
  "zyklus": {"kuerzel": "27Z1", "beginn": "2027-01-01", "ende": "2027-04-30", "status": "eingefroren"},
  "version": {"nummer": 1, "eingefroren_am": "2026-12-20T10:00:00Z", "begruendung": null},
  "key_results": [{"id": "m1", "ebene": "team", "kuerzel": "KR 9.1", "titel": "Aus OKR", "team": "Material", "budget_vorschlag_cent": 0}]
}'::jsonb);
select test.pruefe((select count(*) = 1 from periode where name = '27Z1'), 'gleichnamige Periode verknüpft');
select test.pruefe(
  (select count(*) = 1 and min(okr_id) = 'm1' and min(titel) = 'Aus OKR' from key_result k join periode p on p.id = k.periode_id where p.name = '27Z1'),
  'von Hand angelegtes KR verknüpft und aktualisiert');

reset role;
\echo 'Tests für die OKR-Übernahme bestanden.'
