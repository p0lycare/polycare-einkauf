-- Mail-Benachrichtigungen: Empfänger je Anlass und Versandprotokoll

-- Empfänger nach einem Workflow-Schritt, abhängig vom aktuellen Status der Anforderung.
-- Nur aufrufbar von Personen, die die Anforderung sehen dürfen.
--   zur_freigabe  → bei_teamleitung: Teamleitung; bei_gf: alle GF außer der anfordernden Person
--   zum_bestellen → Einkauf
--   freigegeben / abgelehnt / bestellt → anfordernde Person
create function mail_empfaenger(p_anforderung uuid, p_anlass text) returns table (email text)
  language plpgsql stable security definer set search_path = public as $$
declare a anforderung;
begin
  select * into a from anforderung where id = p_anforderung;
  if not found or not darf_anforderung_sehen(a.ersteller_id, a.team_id) then return; end if;

  if p_anlass = 'zur_freigabe' then
    if a.status = 'bei_teamleitung' then
      return query select p.email from team t join profile p on p.id = t.leitung_id
                    where t.id = a.team_id and p.id <> a.ersteller_id;
    elsif a.status = 'bei_gf' then
      return query select p.email from profile p where p.ist_gf and p.id <> a.ersteller_id;
    end if;
  elsif p_anlass = 'zum_bestellen' and a.status = 'freigegeben' then
    return query select p.email from profile p where p.ist_einkauf;
  elsif p_anlass in ('freigegeben', 'abgelehnt', 'bestellt') then
    return query select p.email from profile p where p.id = a.ersteller_id;
  end if;
end;
$$;

create table mail_protokoll (
  id bigint generated always as identity primary key,
  zeit timestamptz not null default now(),
  anforderung_id uuid references anforderung on delete cascade,
  anlass text not null,
  an text[] not null default '{}',
  betreff text,
  status text not null check (status in ('gesendet', 'fehler', 'nicht_eingerichtet')),
  fehler text,
  ausgeloest_von uuid references profile
);
create index on mail_protokoll (zeit desc);

alter table mail_protokoll enable row level security;
create policy "Admins sehen das Mailprotokoll" on mail_protokoll for select to authenticated using (ist_admin());

create function mail_protokollieren(p_anforderung uuid, p_anlass text, p_an text[], p_betreff text, p_status text, p_fehler text)
  returns void
  language sql security definer set search_path = public as $$
  insert into mail_protokoll (anforderung_id, anlass, an, betreff, status, fehler, ausgeloest_von)
  values (p_anforderung, p_anlass, coalesce(p_an, '{}'), p_betreff, p_status, left(p_fehler, 500), auth.uid());
$$;
