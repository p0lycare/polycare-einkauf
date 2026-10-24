-- Tests für Angebotsdateien (npm run test:db). Läuft nach workflow.sql in derselben Datenbank.

\set ON_ERROR_STOP on
\set QUIET on

set role authenticated;

-- Hochladen nur in den eigenen Ordner
select test.als('ma@test');
insert into storage.objects (bucket_id, name) values ('angebote', (select auth.uid()::text) || '/a.pdf');
select test.erwarte_fehler($$insert into storage.objects (bucket_id, name)
  values ('angebote', (select id::text from profile where email = 'tl@test') || '/b.pdf')$$, 'row-level security');

-- Datei an eigenen Entwurf hängen, nicht an eingereichte oder fremde Anforderungen
insert into anforderung (ersteller_id, periode_id, team_id, titel, betrag_cent)
select auth.uid(), p.id, t.id, 'Mit Angebot', 5000 from periode p, team t where t.name = 'Material';
insert into anforderung_datei (anforderung_id, pfad, name)
values (test.anforderung('Mit Angebot'), auth.uid()::text || '/a.pdf', 'Angebot.pdf');
select test.erwarte_fehler($$insert into anforderung_datei (anforderung_id, pfad, name)
  values (test.anforderung('Mikroskop'), auth.uid()::text || '/c.pdf', 'x.pdf')$$, 'row-level security');
select test.erwarte_fehler($$insert into anforderung_datei (anforderung_id, pfad, name)
  values (test.anforderung('Mit Angebot'), (select id::text from profile where email = 'tl@test') || '/d.pdf', 'x.pdf')$$,
  'row-level security');
select anforderung_einreichen(test.anforderung('Mit Angebot'));

-- Nach dem Einreichen: nicht mehr löschbar, aber für die Teamleitung lesbar
delete from anforderung_datei where name = 'Angebot.pdf';
select test.pruefe((select count(*) = 1 from anforderung_datei where name = 'Angebot.pdf'), 'Datei bleibt nach Einreichen');
delete from storage.objects where name like '%/a.pdf';
select test.pruefe((select count(*) = 1 from storage.objects where name like '%/a.pdf'), 'Speicherobjekt bleibt nach Einreichen');

select test.als('tl@test');
select test.pruefe((select count(*) = 1 from anforderung_datei where name = 'Angebot.pdf'), 'Teamleitung sieht Datei');
select test.pruefe((select count(*) = 1 from storage.objects where name like '%/a.pdf'), 'Teamleitung liest Angebot');

select test.als('prod@test');
select test.pruefe((select count(*) = 0 from anforderung_datei), 'anderes Team sieht keine Dateien');
select test.pruefe((select count(*) = 0 from storage.objects), 'anderes Team liest keine Angebote');

reset role;
\echo 'Angebots-Tests bestanden.'
