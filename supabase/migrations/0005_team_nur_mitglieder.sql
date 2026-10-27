-- Teams, für die nur ihre Mitglieder anfordern dürfen (z. B. „Geschäftsführung“ für GF-Initiativen).
-- Admins schalten das unter Verwaltung → Teams ein; für alle anderen Teams ändert sich nichts.
alter table team add column nur_mitglieder boolean not null default false;

create function darf_fuer_team_anfordern(p_team uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select not coalesce((select nur_mitglieder from team where id = p_team), false)
      or exists (select 1 from profile where id = auth.uid() and team_id = p_team);
$$;

drop policy "eigene Anforderungen anlegen" on anforderung;
create policy "eigene Anforderungen anlegen" on anforderung for insert to authenticated
  with check (ersteller_id = auth.uid() and darf_fuer_team_anfordern(team_id));

drop policy "eigene Entwürfe bearbeiten" on anforderung;
create policy "eigene Entwürfe bearbeiten" on anforderung for update to authenticated
  using (ersteller_id = auth.uid() and status in ('entwurf', 'abgelehnt'))
  with check (ersteller_id = auth.uid() and darf_fuer_team_anfordern(team_id));
