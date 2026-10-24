-- Vorperiode kopieren: Key Results und Budgetposten einer Periode als Vorlage in eine Periode in Planung übernehmen.
-- Schon vorhandene Einträge (gleiches Kürzel bzw. gleicher Name im Team) bleiben unverändert,
-- mehrfaches Kopieren ist also unschädlich. Budgetposten zeigen danach auf das Key Result mit
-- demselben Kürzel in der neuen Periode.
create function periode_kopieren(p_quelle uuid, p_ziel uuid)
  returns table (kopierte_key_results integer, kopierte_posten integer)
  language plpgsql set search_path = public as $$
begin
  if not (ist_finanzen() or ist_admin()) then
    raise exception 'Keine Berechtigung: nur Finanzen und Admins kopieren Perioden';
  end if;
  if p_quelle = p_ziel then raise exception 'Vorperiode und Zielperiode sind dieselbe'; end if;
  if not exists (select 1 from periode where id = p_quelle) then raise exception 'Vorperiode nicht gefunden'; end if;
  if (select status from periode where id = p_ziel) is distinct from 'planung' then
    raise exception 'Die Zielperiode muss in Planung sein';
  end if;

  insert into key_result (periode_id, team_id, kuerzel, titel)
  select p_ziel, k.team_id, k.kuerzel, k.titel from key_result k where k.periode_id = p_quelle
  on conflict (periode_id, kuerzel) do nothing;
  get diagnostics kopierte_key_results = row_count;

  insert into budgetposten (periode_id, team_id, name, geplant_cent, key_result_id)
  select p_ziel, b.team_id, b.name, b.geplant_cent, kz.id
  from budgetposten b
  left join key_result kq on kq.id = b.key_result_id
  left join key_result kz on kz.periode_id = p_ziel and kz.kuerzel = kq.kuerzel
  where b.periode_id = p_quelle
  on conflict (periode_id, team_id, name) do nothing;
  get diagnostics kopierte_posten = row_count;

  return next;
end;
$$;
