# Plan bis zum Start

Start mit allen Kolleginnen und Kollegen: Montag in zwei Wochen (Anmeldung, Rollen vergeben, Pilot).
Bis dahin bauen wir, was ohne sie geht. Stand wird hier abgehakt.

## Woche 1 – startklar machen

- [x] **1. Datenbank-Updates automatisch einspielen** – GitHub Action spielt neue Migrationen nach jedem
      Merge auf `main` ins Supabase-Projekt ein (`.github/workflows/datenbank.yml`)
- [x] **2. Mail-Benachrichtigungen über Microsoft 365**
  - Eingereicht → Teamleitung bzw. GF, mit Link zur Freigabe
  - Freigegeben / abgelehnt (mit Grund) → anfordernde Person
  - Endgültig freigegeben → Einkauf
  - Bestellt → anfordernde Person
- [x] **3. Angebot hochladen, per KI auslesen**
  - PDF/Foto an die Anforderung hängen, für Freigebende und Einkauf sichtbar
  - Claude liest Lieferant, Betrag brutto, Artikel, Link aus und füllt das Formular vor

## Woche 2 – Komfort und Agicap

- [x] **4. Planung erleichtern**
  - „Vorperiode kopieren“ (Budgetposten und Key Results als Vorlage)
  - Übersicht für die GF: alle Teams, Summen, offene Freigaben
  - Hinweis auf gestückelte Anforderungen (mehrere knapp unter 1.000 € beim selben Lieferanten)
- [x] **5. Agicap: Bestandsaufnahme** – welche Tools der MCP-Server anbietet, lesen/schreiben,
      Entscheidung über die Anbindung (gebaut wird nach dem Start): [docs/agicap.md](agicap.md)
- [x] **6. Feinschliff**
  - [x] Hilfe-Seite: Einführung je Rolle (`/hilfe`)
  - [x] Erscheinungsbild wie die Reisekosten-App
  - [x] Handy-Ansicht prüfen (Tabellen unter Budget und Übersicht schmaler)
  - [x] Start-Text für alle: [docs/start-text.md](start-text.md)

## Start-Montag

- [ ] Alle melden sich an, Teams und Rollen in der Verwaltung vergeben
- [ ] Pilot: zwei, drei echte Anforderungen komplett durchlaufen lassen
- [ ] Testdaten vorher entfernen
- [ ] Eine Woche Rückmeldungen sammeln

## Nach dem Start

- Wareneingang und Rechnungen → „ausgegeben“ (mit Silvia und dem Einkauf gestalten)
- Agicap: Budgetplan und erwartete Abflüsse schreiben
- DATEV-Übergabe der Rechnungen
- ~~Auswertung je Key Result für die OKR-Retro~~ ✅ vorgezogen: `/uebersicht/key-results` mit CSV-Export
- Eigenes Supabase-Projekt für Vorschau-Umgebungen (bisher teilen Vorschau und Live eine Datenbank)

## Was noch gebraucht wird

| Für | Was | Wo |
| --- | --- | --- |
| 1 | ~~Supabase Access Token~~ (nicht mehr nötig), Datenbank-Passwort ✅ | GitHub → Settings → Secrets |
| 2 | Mail-Zugangsdaten (`MAIL_*`) der eigenen Entra-App „Polycare Einkauf Mailversand“, Absender einkauf@polycare.de ✅ | Vercel → Environment Variables |
| 3 | `ANTHROPIC_API_KEY` ✅ | Vercel → Environment Variables |
| 5 | ~~Zugang zum Agicap-MCP (als Connector in Claude)~~ ✅ nur Lesen; später technischer Zugang für die App, siehe [agicap.md](agicap.md) | claude.ai → Connectors |
| Start | OKR-Zyklus 26Z3 übernehmen (`OKR_API_KEY` in Vercel), Budgetposten prüfen, Periode aktiv setzen | in der App unter Planung |
