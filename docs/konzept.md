# Polycare Einkauf – Konzept

Interne Web-App, über die Mitarbeitende Produkte und Leistungen anfordern. Jede Anforderung läuft
gegen das Quartalsbudget ihres Teams und, wo es passt, gegen ein Key Result. Nach der Freigabe
bestellt der Einkauf.

## Ziele

1. **Schnell anfordern:** In 2 Minuten ist eine Bestellanforderung angelegt. Ein hochgeladenes
   Angebot (PDF/Foto) wird per KI ausgelesen.
2. **Klare Freigabe:** Jede Anforderung weiß, wer als Nächstes dran ist. Niemand muss per Mail
   nachfragen.
3. **Budget immer aktuell:** Pro Team, Budgetposten und Key Result sieht man jederzeit, was
   geplant, gebunden und ausgegeben ist.
4. **Einkauf entlasten:** Freigegebene Anforderungen landen gebündelt beim Einkauf und sind
   vollständig.

## Grundbegriffe

| Begriff | Bedeutung |
| --- | --- |
| **Periode** | OKR-Zeitraum, in der Regel 3 Monate (z. B. „Q1 2027“). Budget verfällt am Periodenende. |
| **Team** | Material, Produktion, Bausysteme. Erweiterbar. |
| **Budgetposten** | Unterteilung des Teambudgets in einer Periode, z. B. „Laborbedarf“, „Externe Prüfungen“. Optional mit einem Key Result verknüpft. |
| **Key Result** | Aus der OKR-Planung der Periode. Dient als Bezug für Budgetposten und Anforderungen. |
| **Bestellanforderung (BANF)** | Wunsch einer Person: was, wie viel, ungefährer Preis, Lieferant, Begründung. |
| **Bestellung** | Vom Einkauf ausgelöste Bestellung beim Lieferanten. Kann mehrere BANFs bündeln. |

## Budgetlogik

Alle Beträge – Planung, Anforderungen, Freigabegrenzen – sind **brutto**.

Pro Budgetposten zeigt die App:

- **Geplant:** Betrag aus der Quartalsplanung.
- **Gebunden:** Summe der freigegebenen, noch nicht abgerechneten Anforderungen bzw. Bestellungen.
- **Ausgegeben:** Summe der eingegangenen Rechnungen.
- **Verfügbar** = Geplant − Gebunden − Ausgegeben.

Eine Anforderung ohne passenden Budgetposten oder über das verfügbare Budget hinaus ist möglich.
Sie wird aber als **„außerplanmäßig“** markiert und braucht immer die Freigabe der GF.

## Rollen

| Rolle | Darf |
| --- | --- |
| **Mitarbeitende** | Anforderungen anlegen, eigene Anforderungen und das Budget des eigenen Teams sehen |
| **Teamleitung** | wie Mitarbeitende, dazu Freigabe bis 1.000 € im eigenen Team, Budgetplanung des eigenen Teams |
| **Geschäftsführung** | Freigabe über 1.000 € und bei außerplanmäßigen Anforderungen, Budgets aller Teams freigeben |
| **Einkauf** | freigegebene Anforderungen bestellen, Lieferanten pflegen, Wareneingang und Rechnung erfassen |
| **CFO / Finanzen** | alle Budgets und Auswertungen, Perioden anlegen und abschließen, Export nach Agicap |
| **Admin** | Nutzer, Rollen, Teams, Einstellungen |

Eine Person kann mehrere Rollen haben.

## Workflow einer Anforderung

```
Entwurf → Eingereicht → [Teamleitung] → [GF, falls > 1.000 € oder außerplanmäßig]
        → Freigegeben → Bestellt (Einkauf) → Geliefert / Leistung erbracht → Abgerechnet
                 ↘ Abgelehnt (mit Begründung, kann überarbeitet und neu eingereicht werden)
```

- Die Grenze von 1.000 € gilt **brutto pro Anforderung**. Wer eine
  Anforderung in kleinere aufteilt, umgeht die Grenze nicht: Die App weist auf ähnliche Anforderungen
  derselben Person aus den letzten Tagen hin.
- Reicht eine Teamleitung selbst ein, geht die Anforderung direkt an die GF.
- Bei jedem Statuswechsel gibt es eine Benachrichtigung per Microsoft 365 (wie in der Reisekosten-App).
- Jeder Schritt wird im Verlauf protokolliert: wer, wann, Kommentar.

## Quartalsplanung in der App

1. Finanzen legt die neue Periode an. Die Key Results werden importiert oder erfasst.
2. Jede Teamleitung plant die Budgetposten ihres Teams. Die Vorperiode kann als Vorlage kopiert
   werden, dazu sieht man die Ist-Werte der Vorperiode.
3. Die GF gibt den Budgetplan je Team frei.
4. Am Periodenende schließt Finanzen die Periode ab. Offene Restbudgets verfallen. Gebundene, aber
   noch nicht abgerechnete Bestellungen bleiben sichtbar und werden der alten Periode zugerechnet.

## Agicap

Die geplanten Budgets und die erwarteten Abflüsse (freigegebene Bestellungen mit erwartetem
Zahlungsdatum) gehen an Agicap.

Ein CSV-Export kommt nicht infrage. Die Anbindung soll direkt laufen.

- **Erster Schritt: Agicap-MCP-Server.** Agicap bietet einen MCP-Server an, über den Cashflow-Daten,
  Forecasts und Reports abrufbar sind. Ob er Leserechte oder auch Schreibrechte vergibt, stellt der
  Agicap-Admin ein. Die Rechte richten sich nach den Agicap-Berechtigungen der angemeldeten Person.
  - Die App spricht den MCP-Server serverseitig an, über ein technisches Agicap-Konto mit
    passenden Rechten.
  - **Lesen:** Plan- und Ist-Werte aus Agicap als Abgleich in der Budgetübersicht.
  - **Schreiben** (falls der Server das anbietet und freigeschaltet ist): Budgetplan der Periode
    und erwartete Abflüsse freigegebener Bestellungen.
- **Ausweichweg:** die Agicap-REST-API, falls der MCP-Server kein Schreiben erlaubt.
- Bevor wir das bauen, verbinden wir uns einmal mit dem MCP-Server und prüfen, welche Tools er
  tatsächlich anbietet.

## Wiederverwendung aus der Reisekosten-App

Gleicher Stack (Next.js, Supabase, Vercel). Folgendes wird übernommen und angepasst:

- Microsoft-Login und Profilanlage
- Freigabe-Workflow mit Verlauf und abgesicherten Statuswechseln
- Mailversand über Microsoft 365
- Belege und Dokumente in Supabase Storage, Auslesen per KI (hier: Angebote und Rechnungen)
- PDF-Erzeugung, z. B. für das Bestellformular

Die beiden Apps haben **getrennte Datenbanken**. Sie teilen sich nur die Anmeldung über das
Microsoft-Firmenkonto.

## Ausbaustufen

**MVP**
- Login, Rollen, Teams
- Perioden, Budgetposten, Key Results (manuell erfasst)
- Bestellanforderung mit Angebotsupload
- Freigabe Teamleitung/GF inkl. 1.000-€-Regel und außerplanmäßigem Pfad
- Einkaufsansicht: freigegebene Anforderungen, Status „bestellt“
- Budgetübersicht je Team (geplant/gebunden/verfügbar)
- Mail-Benachrichtigungen

**Stufe 2**
- Wareneingang und Rechnungserfassung → Ist-Werte („ausgegeben“)
- Angebot und Rechnung per KI auslesen
- Lieferantenstamm, Bündeln mehrerer Anforderungen zu einer Bestellung
- Quartalsplanung in der App inkl. Kopie der Vorperiode
- Agicap über MCP: Budgetabgleich lesen

**Stufe 3**
- Agicap über MCP oder API: Plan und erwartete Abflüsse schreiben
- DATEV-Übergabe der Rechnungen
- Auswertungen je Key Result für die OKR-Retrospektive

## Offene Fragen

1. Wer gibt unter 1.000 € frei: die Teamleitung, oder ist bis zu einer Grenze gar keine Freigabe nötig?
2. Wie heißen die Budgetposten heute ungefähr? Gibt es eine gemeinsame Liste für alle Teams?
3. Agicap-MCP: Wer bei Polycare ist dort Admin, und darf ein technisches Konto mit Schreibrechten
   angelegt werden?
4. Sollen Rechnungen über diese App laufen, oder kommen sie weiterhin direkt in die Buchhaltung und
   werden nur zugeordnet?
