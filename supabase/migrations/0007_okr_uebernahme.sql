-- Übernahme aus dem OKR-Dashboard: Ein OKR-Zyklus wird zur Periode, seine Team-KRs werden Key Results,
-- Budgetvorschläge belegen Budgetposten vor. Siehe /hilfe/okr und OKR-dashboard/docs/schnittstelle.md.

alter table periode add column okr_zyklus text unique;          -- z. B. "26Z3"
alter table periode add column okr_version integer;             -- zuletzt übernommene Version

alter table key_result add column okr_id text;                  -- stabile ID aus dem OKR-Dashboard
alter table key_result add column okr_top_kr text;              -- Kürzel des Top-Level-KR, zur Einordnung
alter table key_result add column okr_budget_vorschlag_cent integer;
alter table key_result add column okr_entfallen boolean not null default false;  -- nicht mehr im OKR-Set
alter table key_result add constraint key_result_okr_id_eindeutig unique (periode_id, okr_id);

/**
 * Übernimmt ein eingefrorenes OKR-Set (Antwort von GET /api/v1/zyklen/{kuerzel}) in einem Schritt.
 * Nur Finanzen und Admins. Mehrfaches Übernehmen ist unschädlich:
 * - Periode wird über das Zyklus-Kürzel gefunden (oder eine gleichnamige Periode wird verknüpft), sonst neu angelegt
 * - Team-KRs werden über ihre OKR-ID aktualisiert; ein von Hand angelegtes KR mit gleichem Kürzel wird verknüpft
 * - KRs, die im Set fehlen, bleiben erhalten (Ausgaben!) und werden als entfallen markiert
 * - Budgetposten werden nur angelegt, wenn das KR noch keinen hat und sein Team bekannt ist;
 *   bestehende Posten plant die Teamleitung, sie werden nie überschrieben
 * - Teams werden über den Namen zugeordnet; unbekannte Teams werden gemeldet, nicht geraten
 */
create function okr_uebernehmen(p_set jsonb) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_zyklus text := upper(p_set->'zyklus'->>'kuerzel');
  v_version integer := (p_set->'version'->>'nummer')::integer;
  v_periode uuid;
  v_kr record;
  v_team uuid;
  v_kuerzel text;
  v_kr_id uuid;
  v_neu boolean;
  v_ids text[] := '{}';
  v_anzahl_neu integer := 0;
  v_anzahl_aktualisiert integer := 0;
  v_anzahl_posten integer := 0;
  v_anzahl_entfallen integer := 0;
  v_unbekannt text[] := '{}';
begin
  if not (ist_finanzen() or ist_admin()) then
    raise exception 'Keine Berechtigung: nur Finanzen und Admins übernehmen OKR-Sets';
  end if;
  if v_zyklus is null or v_version is null then raise exception 'Ungültiges OKR-Set'; end if;

  select id into v_periode from periode where okr_zyklus = v_zyklus;
  if not found then
    select id into v_periode from periode where upper(name) = v_zyklus and okr_zyklus is null;
  end if;
  if v_periode is null then
    insert into periode (name, beginn, ende, status, okr_zyklus, okr_version)
    values (v_zyklus, (p_set->'zyklus'->>'beginn')::date, (p_set->'zyklus'->>'ende')::date, 'planung', v_zyklus, v_version)
    returning id into v_periode;
  else
    update periode set okr_zyklus = v_zyklus, okr_version = v_version,
      beginn = (p_set->'zyklus'->>'beginn')::date, ende = (p_set->'zyklus'->>'ende')::date
     where id = v_periode;
  end if;

  for v_kr in
    select e->>'id' as okr_id, nullif(trim(e->>'kuerzel'), '') as kuerzel, e->>'titel' as titel,
           nullif(trim(e->>'team'), '') as team, e->>'top_kr' as top_kr,
           nullif(e->>'budget_vorschlag_cent', '')::integer as vorschlag
      from jsonb_array_elements(p_set->'key_results') e
     where e->>'ebene' = 'team'
  loop
    v_ids := v_ids || v_kr.okr_id;
    v_team := null;
    if v_kr.team is not null then
      select id into v_team from team where lower(name) = lower(v_kr.team);
      if v_team is null and not v_kr.team = any (v_unbekannt) then v_unbekannt := v_unbekannt || v_kr.team; end if;
    end if;
    v_kuerzel := coalesce(v_kr.kuerzel, 'OKR ' || left(v_kr.okr_id, 6));

    -- Von Hand angelegtes KR mit gleichem Kürzel übernehmen statt doppelt anlegen
    update key_result set okr_id = v_kr.okr_id
     where periode_id = v_periode and kuerzel = v_kuerzel and okr_id is null;

    insert into key_result (periode_id, team_id, kuerzel, titel, okr_id, okr_top_kr, okr_budget_vorschlag_cent, okr_entfallen)
    values (v_periode, v_team, v_kuerzel, v_kr.titel, v_kr.okr_id, v_kr.top_kr, v_kr.vorschlag, false)
    on conflict (periode_id, okr_id) do update
      set team_id = excluded.team_id, kuerzel = excluded.kuerzel, titel = excluded.titel,
          okr_top_kr = excluded.okr_top_kr, okr_budget_vorschlag_cent = excluded.okr_budget_vorschlag_cent,
          okr_entfallen = false
    returning id, (xmax = 0) into v_kr_id, v_neu;
    if v_neu then v_anzahl_neu := v_anzahl_neu + 1; else v_anzahl_aktualisiert := v_anzahl_aktualisiert + 1; end if;

    if v_team is not null and coalesce(v_kr.vorschlag, 0) > 0
       and not exists (select 1 from budgetposten where key_result_id = v_kr_id) then
      insert into budgetposten (periode_id, team_id, name, geplant_cent, key_result_id)
      values (v_periode, v_team, left(v_kuerzel || ' ' || v_kr.titel, 120), v_kr.vorschlag, v_kr_id)
      on conflict (periode_id, team_id, name) do nothing;
      if found then v_anzahl_posten := v_anzahl_posten + 1; end if;
    end if;
  end loop;

  update key_result set okr_entfallen = true
   where periode_id = v_periode and okr_id is not null and not okr_entfallen and not (okr_id = any (v_ids));
  get diagnostics v_anzahl_entfallen = row_count;

  return jsonb_build_object(
    'periode_id', v_periode, 'zyklus', v_zyklus, 'version', v_version,
    'neu', v_anzahl_neu, 'aktualisiert', v_anzahl_aktualisiert, 'entfallen', v_anzahl_entfallen,
    'budgetposten', v_anzahl_posten, 'unbekannte_teams', to_jsonb(v_unbekannt));
end;
$$;
revoke execute on function okr_uebernehmen(jsonb) from public, anon;
