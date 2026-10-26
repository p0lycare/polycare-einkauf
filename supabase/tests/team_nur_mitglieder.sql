-- Tests für Teams, für die nur ihre Mitglieder anfordern dürfen (npm run test:db). Läuft nach workflow.sql.

\set ON_ERROR_STOP on
\set QUIET on

set role authenticated;

-- Nur Admins schalten die Einstellung um
select test.als('admin@test');
insert into team (name, nur_mitglieder) values ('Geschäftsführung', true);
update profile set team_id = (select id from team where name = 'Geschäftsführung') where email = 'gf@test';

select test.als('tl@test');
update team set nur_mitglieder = true where name = 'Produktion';
select test.pruefe(not (select nur_mitglieder from team where name = 'Produktion'), 'Nicht-Admin ändert die Einstellung nicht');

-- Fremde dürfen für ein solches Team nicht anfordern, für normale Teams weiterhin schon
select test.als('ma@test');
select test.erwarte_fehler($$insert into anforderung (ersteller_id, periode_id, team_id, titel, betrag_cent)
  select auth.uid(), p.id, t.id, 'GF-Initiative von außen', 1000
  from periode p, team t where p.name = 'Q4 2026' and t.name = 'Geschäftsführung'$$, 'row-level security');
insert into anforderung (ersteller_id, periode_id, team_id, titel, betrag_cent)
select auth.uid(), p.id, t.id, 'Für ein anderes Team', 1000 from periode p, team t where p.name = 'Q4 2026' and t.name = 'Produktion';
select test.pruefe(test.anforderung('Für ein anderes Team') is not null, 'normales fremdes Team bleibt möglich');

-- Auch nicht über das Bearbeiten eines eigenen Entwurfs
select test.erwarte_fehler($$update anforderung set team_id = (select id from team where name = 'Geschäftsführung')
  where titel = 'Für ein anderes Team'$$, 'row-level security');

-- Mitglieder dürfen
select test.als('gf@test');
insert into anforderung (ersteller_id, periode_id, team_id, titel, betrag_cent)
select auth.uid(), p.id, t.id, 'GF-Initiative', 1000 from periode p, team t where p.name = 'Q4 2026' and t.name = 'Geschäftsführung';
select test.pruefe(test.anforderung('GF-Initiative') is not null, 'Mitglied fordert für sein Team an');

reset role;
\echo 'Tests für Teams nur für Mitglieder bestanden.'
