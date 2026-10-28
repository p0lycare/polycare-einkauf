-- Absicherung nach dem Code-Review vor dem Start

-- ---------------------------------------------------------------------------
-- 1. Nur Microsoft-Konten (Polycare-Tenant) bekommen ein Profil.
--    Andere Anmeldearten (z. B. E-Mail-Registrierung) scheitern, statt Zugang zu bekommen.
--    Admin wird automatisch nur die allererste Person – nicht jeder, sobald es keinen Admin mehr gibt.
-- ---------------------------------------------------------------------------
create or replace function profil_anlegen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_app_meta_data->>'provider', '') <> 'azure' then
    raise exception 'Anmeldung nur mit dem Polycare-Microsoft-Konto';
  end if;
  insert into profile (id, name, email, ist_admin)
  values (new.id, name_aus_metadaten(new.raw_user_meta_data, new.email), new.email,
          not exists (select 1 from profile));
  return new;
end;
$$;

-- Der letzte Admin kann sich die Rolle nicht versehentlich nehmen
create function letzten_admin_schuetzen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if old.ist_admin and not new.ist_admin
     and not exists (select 1 from profile where ist_admin and id <> old.id) then
    raise exception 'Mindestens eine Person muss Admin bleiben';
  end if;
  return new;
end;
$$;
create trigger letzten_admin_schuetzen
  before update of ist_admin on profile
  for each row execute function letzten_admin_schuetzen();
revoke execute on function letzten_admin_schuetzen() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Mailprotokoll nur für Angemeldete und nur zu Anforderungen, die man sieht;
--    Einträge ohne Anforderung (Testmail) nur für Admins.
-- ---------------------------------------------------------------------------
create or replace function mail_protokollieren(p_anforderung uuid, p_anlass text, p_an text[], p_betreff text, p_status text, p_fehler text)
  returns void
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_anforderung is null then
    if not ist_admin() then raise exception 'Keine Berechtigung'; end if;
  elsif not exists (select 1 from anforderung a where a.id = p_anforderung and darf_anforderung_sehen(a.ersteller_id, a.team_id)) then
    raise exception 'Keine Berechtigung';
  end if;
  insert into mail_protokoll (anforderung_id, anlass, an, betreff, status, fehler, ausgeloest_von)
  values (p_anforderung, p_anlass, coalesce(p_an, '{}'), p_betreff, p_status, left(p_fehler, 500), auth.uid());
end;
$$;
revoke execute on function mail_protokollieren(uuid, text, text[], text, text, text) from public, anon;

-- Interne Rechenhilfen nicht von außen aufrufbar (verrieten sonst das verfügbare Budget fremder Posten)
revoke execute on function ist_ausserplanmaessig(anforderung) from public, anon, authenticated;
revoke execute on function braucht_gf(anforderung) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Gleichzeitige Freigaben auf denselben Budgetposten nacheinander abarbeiten:
--    Beim Holen der Anforderung wird auch ihr Budgetposten gesperrt, damit zwei Freigaben
--    nicht beide dasselbe Restbudget sehen.
-- ---------------------------------------------------------------------------
create or replace function anforderung_holen(p_id uuid) returns anforderung
  language plpgsql security definer set search_path = public as $$
declare a anforderung;
begin
  select * into a from anforderung where id = p_id for update;
  if not found then raise exception 'Anforderung nicht gefunden'; end if;
  if a.budgetposten_id is not null then
    perform 1 from budgetposten where id = a.budgetposten_id for update;
  end if;
  return a;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Keine Freigabe mehr in einer abgeschlossenen Periode (Restbudget ist verfallen)
-- ---------------------------------------------------------------------------
create or replace function anforderung_freigeben(p_id uuid, p_kommentar text default null) returns anforderung_status
  language plpgsql security definer set search_path = public as $$
declare a anforderung; neu anforderung_status;
begin
  a := anforderung_holen(p_id);
  if a.status not in ('bei_teamleitung', 'bei_gf') then raise exception 'Anforderung wartet nicht auf Freigabe'; end if;
  if not darf_freigeben(a) then raise exception 'Keine Berechtigung zur Freigabe'; end if;
  if (select status from periode where id = a.periode_id) = 'abgeschlossen' then
    raise exception 'Die Periode ist abgeschlossen – bitte ablehnen und in der aktuellen Periode neu anfordern lassen';
  end if;

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

-- ---------------------------------------------------------------------------
-- 5. Links nur http(s) – auch bei direktem Zugriff an der App vorbei.
--    „not valid“: gilt für neue und geänderte Zeilen, bestehende bleiben unberührt.
-- ---------------------------------------------------------------------------
alter table anforderung add constraint link_nur_http check (link is null or link ~* '^https?://') not valid;
