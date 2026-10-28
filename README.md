# Polycare Einkauf

Interne Web-App für Bestellanforderungen bei Polycare: Mitarbeitende fordern Produkte und Leistungen
an, jede Anforderung läuft gegen das Quartalsbudget ihres Teams (optional mit Bezug zu einem Key
Result). Die Teamleitung gibt frei, über 1.000 € brutto und bei außerplanmäßigen Anforderungen
zusätzlich die Geschäftsführung, danach bestellt der Einkauf.

Konzept und Ausbaustufen: [docs/konzept.md](docs/konzept.md)

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind)
- **Supabase** – Postgres, Login mit Microsoft, Row Level Security; Region Frankfurt (eu-central-1)
- **Vercel** – Hosting, Preview je Pull Request; Serverfunktionen in Frankfurt (`vercel.json`)

Gleicher Stack wie die Reisekosten-App, aber eigene Datenbank. Gemeinsam ist nur die Anmeldung mit
dem Microsoft-Firmenkonto; Rollen werden je App gepflegt.

## Stand

| Bereich | Status |
| --- | --- |
| Datenbankschema, Berechtigungen, Freigabe-Workflow | ✅ `supabase/migrations/0001_init.sql` |
| Login mit Microsoft | ✅ |
| Anforderung anlegen, einreichen, zurückziehen | ✅ |
| Freigabe Teamleitung / GF (1.000-€-Grenze, außerplanmäßig) | ✅ |
| Einkauf: freigegebene Anforderungen bestellen | ✅ |
| Budgetübersicht (geplant / in Freigabe / gebunden / verfügbar) | ✅ |
| Planung: Perioden, Key Results, Budgetposten | ✅ |
| Verwaltung: Teams, Teamleitungen, Rollen, Freigabegrenze | ✅ |
| Mail-Benachrichtigungen (Microsoft 365) | ✅ `src/lib/mail`, Testmail und Protokoll unter Verwaltung |
| Angebot hochladen, per KI auslesen | ✅ `src/lib/ki`, Bucket `angebote` |
| Übersicht für GF und Finanzen | ✅ `/uebersicht`: Teams, offene Freigaben, Stückelung, außerplanmäßig |
| Auswertung je Key Result | ✅ `/uebersicht/key-results`, CSV-Export für Finanzen |
| Hinweis auf gestückelte Anforderungen | ✅ `src/lib/einkauf/stueckelung.ts`, an der Anforderung und in der Übersicht |
| Vom OKR zur Bestellung (Zusammenspiel mit dem OKR-Dashboard) | ✅ `/hilfe/okr` – Umsetzung der Schnittstelle offen |
| Einführung je Rolle | ✅ `/hilfe`, Texte in `src/lib/hilfe/einfuehrung.ts` |
| Wareneingang, Rechnung → „ausgegeben“ | ⏳ |
| Agicap über MCP | ⏳ |

## Rollen

| Rolle | Wo gepflegt | Darf |
| --- | --- | --- |
| Mitarbeitende | – | Anforderungen anlegen, Budget des eigenen Teams sehen |
| Teamleitung | Verwaltung → Teams | Freigabe im eigenen Team, Budget planen solange die Periode in Planung ist |
| GF | Verwaltung → Personen | Freigabe über der Grenze und außerplanmäßig, alle Teams sehen |
| Einkauf | Verwaltung → Personen | Freigegebenes bestellen |
| Finanzen | Verwaltung → Personen | Perioden, Key Results und Budgets aller Teams |
| Admin | Verwaltung → Personen | Teams, Rollen, Freigabegrenze. Die erste angemeldete Person wird Admin. |

Niemand gibt die eigene Anforderung frei: Fordert eine Teamleitung selbst an, entscheidet die GF.

Teams ohne Teamleitung (z. B. „Geschäftsführung“) schicken Anforderungen direkt an die GF. Ist am Team
„Nur Mitglieder fordern an“ gesetzt, dürfen nur Personen aus dem Team dafür anfordern – die Datenbank prüft das
(`darf_fuer_team_anfordern`, Migration 0005).

## E-Mail-Versand

Mails gehen über Microsoft Graph aus **einkauf@polycare.de** (`src/lib/mail`).

- Eigene Entra-App **„Polycare Einkauf Mailversand“** (Anwendungs-ID `fa14555e-…`), Zugangsdaten als
  `MAIL_*` in Vercel. In Entra unter API-Berechtigungen **kein** Mail.Send eintragen – sonst dürfte die
  App aus jedem Postfach senden.
- Das Senderecht kommt aus Exchange Online (RBAC for Applications): Rolle `Application Mail.Send` mit dem
  Scope „Polycare Mailversand“ (`PrimarySmtpAddress -eq 'einkauf@polycare.de'`). In Exchange heißt der
  Service Principal „Polycare Mailversand“.
- Prüfen: `Test-ServicePrincipalAuthorization -Identity <AppId> -Resource einkauf@polycare.de` → `InScope: True`,
  für jedes andere Postfach `False`. In der App: Verwaltung → „Testmail an mich senden“.
- Die Reisekosten-App hat ihre eigene Entra-App mit eigenen Scopes; beide teilen keine Zugangsdaten.

## Lokal starten

```bash
npm install
vercel env pull .env.local   # Supabase-URL und Publishable Key aus Vercel holen
npm run dev
```

## Prüfen

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:db   # Workflow- und Berechtigungstests gegen ein Postgres (PGHOST, PGUSER, … setzen)
```

## Datenbank ändern

1. Neue Migration unter `supabase/migrations/` anlegen (fortlaufend nummeriert, z. B. `0002_….sql`)
2. `npm run test:db` und danach die Typen neu erzeugen: `npm run db:types`
3. Nach dem Merge auf `main` spielt die Action **Datenbank** (`.github/workflows/datenbank.yml`) die
   Migration ins Supabase-Projekt ein. Sie verbindet sich direkt mit der Datenbank und braucht nur das
   Repository-Secret `SUPABASE_DB_PASSWORD`.

Plan bis zum Start: [docs/plan.md](docs/plan.md)
