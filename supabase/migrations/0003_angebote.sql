-- Angebote (PDF/Foto) an Anforderungen

create table anforderung_datei (
  id uuid primary key default gen_random_uuid(),
  anforderung_id uuid not null references anforderung on delete cascade,
  pfad text not null unique,               -- Storage-Bucket "angebote": <user_id>/<uuid>.<endung>
  name text not null,
  content_type text,
  groesse integer,
  created_at timestamptz not null default now()
);
create index on anforderung_datei (anforderung_id);

alter table anforderung_datei enable row level security;

create function anforderung_bearbeitbar(p_anforderung uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from anforderung
                  where id = p_anforderung and ersteller_id = auth.uid() and status in ('entwurf', 'abgelehnt'));
$$;

create policy "Dateien lesen wie Anforderung" on anforderung_datei for select to authenticated
  using (exists (select 1 from anforderung a where a.id = anforderung_id
                 and darf_anforderung_sehen(a.ersteller_id, a.team_id)));
create policy "Dateien an eigene Entwürfe hängen" on anforderung_datei for insert to authenticated
  with check (anforderung_bearbeitbar(anforderung_id) and pfad like auth.uid()::text || '/%');
create policy "Dateien aus eigenen Entwürfen entfernen" on anforderung_datei for delete to authenticated
  using (anforderung_bearbeitbar(anforderung_id));

-- Privater Bucket, max. 10 MB, Bilder und PDF.
-- Hochladen nur in den eigenen Ordner; das geht schon vor dem ersten Speichern der Anforderung,
-- damit die KI das Angebot auslesen und das Formular vorfüllen kann.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('angebote', 'angebote', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']);

create function darf_angebot_sehen(p_pfad text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from anforderung_datei d join anforderung a on a.id = d.anforderung_id
                  where d.pfad = p_pfad and darf_anforderung_sehen(a.ersteller_id, a.team_id));
$$;

create policy "Angebote hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'angebote' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Angebote lesen" on storage.objects for select to authenticated
  using (bucket_id = 'angebote'
         and ((storage.foldername(name))[1] = auth.uid()::text or darf_angebot_sehen(name)));
-- Löschen nur eigene Dateien, die an keiner eingereichten Anforderung mehr hängen
create policy "Angebote löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'angebote'
         and (storage.foldername(name))[1] = auth.uid()::text
         and not exists (select 1 from public.anforderung_datei d
                          where d.pfad = objects.name and not anforderung_bearbeitbar(d.anforderung_id)));
