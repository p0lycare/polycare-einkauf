# Agicap – Bestandsaufnahme des MCP-Servers

Stand: 28.10.2026. Geprüft über den Agicap-Connector in Claude mit **reinen Leserechten**.
Es wurden nur lesende Tools aufgerufen, jeweils mit kleinen Abfragen. Echte Beträge, Kontonummern
und Personen stehen hier bewusst nicht drin.

Kurzfassung:

- Agicap kennt **eine Entität (Polycare)** in EUR, ohne Konsolidierung. Der Budgetplan
  (Cashflow-Plan) ist **monatlich**, gilt für alle Konten gemeinsam und rechnet jede Unterkategorie
  einzeln.
- Die Kategorien passen gut zur App: Unter „Operativer Cashflow“ gibt es **Materialentwicklung,
  Bausystementwicklung und Produktionsentwicklung**, also genau unsere drei Teams, jeweils mit
  Unterkategorien wie Rohstoffe oder Laborausstattung.
- Lesen liefert alles, was wir für einen Abgleich brauchen: Budget, Ist und Erwartet je Kategorie
  und Monat. Ist-Buchungen gibt es nur je Kategorie, **nicht je Anforderung**.
- Schreibende Tools zeigt der Connector mit Leserechten nicht an. Die Beschreibungen verweisen aber
  auf Tools für Budgets, Kategorien und erwartete Zahlungen. Ob sie für unseren Fall reichen, lässt
  sich erst mit Schreibrechten prüfen.

## Verfügbare Tools

46 Tools, davon 45 lesend. Das letzte, `request_new_tool`, schickt einen Wunsch an das
Agicap-Produktteam. Es ändert keine Daten, ist aber eine Nachricht nach außen und wurde deshalb
nicht aufgerufen. `forecast_cashflow_with_ai` rechnet nur eine Prognose, schreibt nichts und wurde
nicht gebraucht.

### Für die Einkaufs-App relevant

| Tool | Zweck | Wichtige Parameter | Aufgerufen | Ergebnis |
| --- | --- | --- | --- | --- |
| `get_entities_and_consolidations` | Entitäten und Konsolidierungen mit IDs | – | ja | 1 Entität, keine Konsolidierung |
| `get_entity_category_tree` | Kategoriebaum einer Entität (Zu- oder Abflüsse), Integer-IDs, MwSt.-Satz je Kategorie | `entity_id`, `categories_type` (Inflow/Outflow) | ja | siehe [Kategorien](#kategorien) |
| `get_shared_category_trees` | organisationsweite Kategoriebäume (GUIDs) | – | ja | Kernkategorien wie im Baum oben, zwei leere Vorlagen |
| `get_cash_flow_plan_statement` | **Budgetplan**: je Kategorie und Zeitraum Budget, Ist, Erwartet, Rest, Erfüllungsgrad | `entity_id`, `frequency` (DAILY/WEEKLY/MONTHLY/QUARTERLY), `from_offset`, `to_offset`, `scenario_id` | ja | Budget nur auf Blatt-Kategorien, Summen nach oben |
| `get_paid_transactions` | **Ist-Buchungen** (Bankumsätze) | `entity_id`, `start_date`, `end_date`, `category_ids`, `bank_account_ids`, Seitengröße/Cursor | ja | Betrag, Datum, Kategorie, Konto, Freitext |
| `get_paid_transactions_total_in_currency` | Summe ausgewählter Ist-Buchungen | `entity_id`, `paid_transaction_ids`, `target_currency` | nein | – |
| `get_expected_transactions` | **erwartete Zahlungen** (Rechnungen, Budgets, Daueraufträge, manuelle) | wie oben, dazu `scenario_id` | ja | mit Fälligkeit, Typ und Herkunft |
| `get_expected_transactions_total_in_currency` | Summe erwarteter Zahlungen | – | nein | – |
| `get_scenarios` | alternative Szenarien des Budgetplans | `entity_id` | ja | 5 Szenarien aus früheren Planungsrunden |
| `get_variance_analysis` | Wochenvergleich Kurzfristprognose gegen Ist | `entity_id`, `currency`, Datumsbereich, Stichtag | nein | – |
| `get_estimates` | wöchentliche Schätzbeträge der Liquiditätsplanung | `entities`, `date_from`, `date_to` | nein | – |
| `get_entity_cash_flow_plan_balances` | Kontostand mit Budget | `entity_id`, `frequency`, Offsets | nein | – |
| `get_bank_accounts` | Bankkonten | `entity_id` | ja | 6 Konten, 1 davon Agicap-Zahlungskonto |
| `get_card_transactions` | Kartenzahlungen (Agicap Spend) | `entity_id`, Datum, Status, Karte, Kostenstelle, Art | ja | Händler, Betrag brutto, Beleg-Status |
| `get_cards` | Firmenkarten mit Limit und Verbrauch | `entity_id` | ja | Karten je Person, teils je Team benannt |
| `get_suppliers` | Lieferantenstamm | `entity_id`, `supplier_id` | nein | – |
| `get_supplier_invoices_to_verify` | Eingangsrechnungen in Prüfung | `entity_ids`, Status, Datum | ja | leer |
| `get_verified_supplier_invoices` | geprüfte Eingangsrechnungen mit Zahlstatus | `entity_ids`, Status, Datum | ja | leer |
| `get_account_payables_cost_centers` | Kostenstellen | `entity_id` | ja | leer |
| `get_account_payables_natures` | Ausgabearten | `entity_ids` | ja | leer |
| `get_analytical_codes` | Analyseachsen und -codes | `entity_id` | ja | leer |
| `get_categorization_rules` | Regeln für die automatische Kategorisierung | `entity_id` | ja | gut 230 Regeln, alle nach Buchungstext |
| `get_dashboards` | eigene Dashboards | `entity_id` | ja | 1 persönliches, 5 alte |
| `search_documentation` | Agicap-Hilfe durchsuchen | `query` | ja | genutzt für MwSt. und erwartete Zahlungen |

### Für die Einkaufs-App nicht relevant (nicht im Detail angesehen)

Debitoren und Mahnwesen (`get_account_receivables_invoices`, `get_account_receivables_credit_notes`,
`get_clients`, `get_client_contacts`, `get_dso`), Zahlungsverkehr (`get_draft_payments`,
`get_payment_remittances`, `get_payment_beneficiaries`), Geldanlagen und Finanzierung
(`get_financial_investment_amount_over_time`, `get_financial_investments_deposit_accounts`,
`get_other_financial_investments`, `get_financing_instruments`), Kontostände
(`get_entities_current_bank_balances`, `get_entities_cash_positioning_balances`), Einstellungen
(`get_banks`, `get_mark_as_reconciled_rules`, `get_pnl_conversion_settings`,
`get_supplier_invoice_verification_workflows`), Auswertungen (`get_kpis`, `get_dashboard_items`)
und die KI-Prognose `forecast_cashflow_with_ai`.

### Schreibende Tools

Der Connector zeigt mit Leserechten keine an. In den Tool-Beschreibungen werden aber genannt:
`create_estimates`, `create_categorization_rule`, `create_analytical_codes`,
`create_bank`/`create_bank_account`, `justify_card_transaction_with_receipt`,
`create/rename/move_shared_category` sowie allgemein „Budget-, Buchungs- und Kategorie-Tools“
und „weitere Tools für erwartete Zahlungen“. Die genauen Namen und Parameter für **Budget
schreiben** und **erwartete Zahlung anlegen** sehen wir erst mit Schreibrechten.

## Datenstruktur (Beispiele, Werte verfremdet)

### Entität

```json
{ "id": 10001, "name": "Polycare", "referenceCurrency": "EUR",
  "forecastFrequency": "MONTHLY", "forecastMode": "CONSOLIDATED",
  "forecastCalculationMode": "NON_SHARED_FORECASTS" }
```

- `MONTHLY`: Budgets werden je Monat gepflegt. Lesen geht auch als `QUARTERLY`, Schreiben
  vermutlich nur monatlich.
- `CONSOLIDATED`: ein Budget für alle Konten, nicht je Konto.
- `NON_SHARED_FORECASTS`: Jede Unterkategorie hat ihr eigenes Budget. Die Oberkategorie zeigt
  die Summe, und ein Überschuss in einer Unterkategorie gleicht kein Defizit in einer anderen aus.

### Kategorien

Abflüsse, gekürzt auf den für uns wichtigen Teil (aktueller Baum ab 2025; ein alter Baum
„vor 31.12.2024“ ist noch vorhanden, aber leer):

```
Operativer Cashflow
├── Materialentwicklung          → Team Material
│   ├── Rohstoffe
│   ├── Fremdleistungen (Vermahlung, Transporte, Beratung)
│   ├── Patente
│   ├── Laborausstattung
│   ├── Prüfungen und Zertifizierungen
│   └── Nachhaltigkeit
├── Bausystementwicklung         → Team Bausysteme
│   ├── Entwicklung
│   ├── Prüfungen und Zertifizierungen
│   ├── Beratungsleistungen
│   └── Patente
├── Produktionsentwicklung       → Team Produktion
│   ├── Rohstoffe
│   ├── Ausstattung (Werkzeuge und Kleingeräte, Arbeitsschutz)
│   ├── Entsorgung
│   ├── Instandhaltung
│   └── Produktion Berding
├── Projekte (SEMBLA System …, Hüttensandmehl, SemCrete)
├── Verwaltung (Miete, Software/IT, Büromaterial, Marketing,
│               Reise-/Spesen je Bereich, Beratung, Leasing …)
├── Personalkosten (je Bereich)
└── Bankgebühren, Steuern, USt.-Schuld
```

Jede Kategorie hat eine **Integer-ID** im Entitätsbaum und eine **GUID** im organisationsweiten
Baum. Für Budget und Buchungen zählen die Integer-IDs. Ein Budget lässt sich nur auf
Blatt-Kategorien setzen (`isForecastSettable`). Der MwSt.-Satz ist fast überall leer.

### Budgetplan je Kategorie und Zeitraum

```json
{ "categoryId": 20001, "name": "Laborausstattung", "isForecastSettable": true,
  "valuesByOffset": [{ "offset": 0, "forecast": 1000.0, "realized": 250.0,
    "expected": 100.0, "remaining": 650.0, "achievementRate": 0.35, "cashFlow": 1000.0 }] }
```

- `forecast` = Budget, `realized` = bezahlt, `expected` = erwartet, `remaining` = Budget minus
  (bezahlt + erwartet), nicht unter 0.
- Beträge sind **Euro mit Nachkommastellen**, Abflüsse positiv (die Richtung ergibt sich aus
  dem Abschnitt `outflows`).
- `offset` zählt ab dem aktuellen Zeitraum (0 = jetzt, −1 = Vorperiode).

### Ist-Buchung

```json
{ "paidTransactionId": "v1/5000000001", "bankAccountId": 900001,
  "title": "<Buchungstext der Bank mit Verwendungszweck und Gegenkonto>",
  "flow": "outflow", "categoryId": 20002, "paymentDate": "2026-10-01", "amount": 99.99 }
```

Es gibt keinen Lieferanten und keine Rechnungs- oder Bestellnummer als eigenes Feld. Alles steht
im freien Buchungstext der Bank, und der Betrag ist der Bankbetrag, also **brutto**.

### Erwartete Zahlung

```json
{ "expectedTransactionId": "v2/<uuid>", "bankAccountId": 900002,
  "title": "Supplier Invoice - 1234 - <Lieferant>", "flow": "outflow",
  "categoryId": 20003, "paymentDate": "2026-10-28", "latePaymentDate": "2021-07-19",
  "amount": 99.99, "expectedSource": "business_document", "expectedType": "supplier_invoice" }
```

`expectedType` unterscheidet `supplier_invoice`, `client_invoice`, `forecast` (Budget),
`recurring` usw. Überfällige Posten werden auf heute gesetzt; das ursprüngliche Datum steht in
`latePaymentDate`.

### Kartenzahlung (Agicap Spend)

```json
{ "id": "<uuid>", "merchantName": "<Händler>", "status": "toJustify",
  "paymentDate": "2026-10-27T19:34:59Z", "natureId": null, "costCenterId": null,
  "card": { "holderFullname": "<Person>" },
  "amounts": { "original": { "value": -99.99, "currency": "EUR" } } }
```

Kartenzahlungen haben keine Kategorie-ID. Kostenstelle und Ausgabeart sind leer, weil beides in
Agicap nicht eingerichtet ist.

### Auffälligkeiten

- In den erwarteten Zahlungen liegen noch **alte Eingangsrechnungen aus 2021**. Sie gelten als
  überfällig und erscheinen deshalb immer im aktuellen Monat. Das verfälscht „erwartet“ in
  einzelnen Kategorien des alten Baums. Aufräumen ist Sache von Finanzen.
- Der Rechnungseingang (Lieferantenrechnungen prüfen) wird in Agicap nicht genutzt; beide Listen
  sind leer.
- Die automatische Kategorisierung läuft ausschließlich über den Buchungstext.

## Abbildung auf die App

| App | Agicap | Bemerkung |
| --- | --- | --- |
| Team | Oberkategorie unter „Operativer Cashflow“ | Material → Materialentwicklung, Bausysteme → Bausystementwicklung, Produktion → Produktionsentwicklung |
| Budgetposten | Blatt-Kategorie unter dieser Oberkategorie | neue Spalte `budgetposten.agicap_kategorie_id` (Integer). Mehrere Posten dürfen auf dieselbe Kategorie zeigen. |
| Key Result | – | Agicap kennt keine Key Results. Ein Projekt (Agicap-Projektfilter) wäre denkbar, ist aber nicht über den MCP lesbar. |
| Periode (OKR-Zyklus, 4 Monate) | 4 Monatswerte | Lesen: `MONTHLY` mit passenden Offsets und aufsummieren. `QUARTERLY` passt nicht, weil die Zyklen keine Quartale sind. |
| `geplant_cent` | `forecast` | Euro × 100, gerundet |
| gebunden (freigegeben + bestellt) | `expected`, sobald wir erwartete Zahlungen schreiben | Agicap rechnet dann selbst `remaining` = Budget − (bezahlt + erwartet). Das entspricht unserem „verfügbar“. |
| ausgegeben (noch nicht gebaut) | `realized` je Kategorie | nur als Summe je Kategorie, nicht je Anforderung |
| außerplanmäßig (ohne Posten) | – | braucht eine Ersatzkategorie je Team, sonst „Zu kategorisieren“ |
| Beträge brutto in Cent | Euro mit Nachkommastellen | Bankbeträge sind brutto. Weil keine MwSt.-Automatik aktiv ist, sind auch die Budgets wie eingegeben, also brutto (bitte bestätigen, siehe Fragen). |

### Kann Agicap „ausgegeben“ belegen?

**Teilweise.** Je Kategorie und Monat liefert `get_cash_flow_plan_statement` die bezahlten
Summen (`realized`) zuverlässig. Damit können wir in der Budgetübersicht „laut Agicap bezahlt“
neben „gebunden“ stellen.

Eine bestimmte Anforderung als bezahlt markieren können wir damit nicht. Ein Bankumsatz trägt
keine Bestell- oder Rechnungsnummer als Feld, und Kartenzahlungen haben gar keine Kategorie. Für
„ausgegeben“ je Anforderung bleibt es beim Plan: Wareneingang und Rechnung in der App erfassen.
Agicap dient dann als Abgleich je Kategorie.

### Bestellte Anforderungen als erwartete Abflüsse

Fachlich passt das genau: Eine erwartete Zahlung braucht Titel, Konto, Kategorie, Betrag und
Datum, die Agicap-Hilfe beschreibt das manuelle Anlegen und den Import. Dafür braucht es
**Schreibrechte**. Vorschlag für später:

- Bei „bestellt“ eine erwartete Zahlung anlegen: Titel `BA-<nr> – <Lieferant>`, Kategorie aus dem
  Budgetposten, Betrag brutto, Datum = Bestelldatum plus übliches Zahlungsziel. Die
  Agicap-ID speichern wir an der Anforderung.
- Sobald die Rechnung bezahlt ist bzw. der Bankumsatz da ist, die erwartete Zahlung löschen oder
  abgleichen. Wer das macht (App, Finanzen, Agicap-Abgleich), ist offen.
- Einschränkung laut Agicap-Hilfe: Manuelle erwartete Zahlungen brauchen ein manuelles Konto oder
  die Funktion „Expected transactions on synchronized accounts“. Alle Bankkonten von Polycare sind
  synchronisiert.

## Empfehlung für die Anbindung nach dem Start

1. **Zuerst nur lesen, ohne neue Rechte.** In der Budgetübersicht je Budgetposten bzw. Kategorie
   „Agicap: Budget / bezahlt / erwartet“ für die Monate des Zyklus zeigen. Voraussetzung ist die
   Zuordnung Budgetposten → Agicap-Kategorie in der Planung (Auswahlliste aus
   `get_entity_category_tree`). Das macht Unterschiede zwischen App-Planung und Agicap-Budget
   sofort sichtbar und braucht keine Schreibrechte.
2. **Dann erwartete Abflüsse schreiben.** Das ist der größte Nutzen für Finanzen, weil bestellte
   Ware sofort in der Liquiditätsplanung steht. Das braucht Schreibrechte auf erwartete Zahlungen,
   beschränkt auf die Kategorien unter Material-, Bausystem- und Produktionsentwicklung, sowie die
   Freischaltung für synchronisierte Konten.
3. **Budget schreiben zuletzt, oder gar nicht.** Das Budget pflegt Finanzen heute selbst in
   Agicap, mit eigenen Szenarien. Wenn die App es überschreibt, braucht es klare Regeln: welches
   Szenario, wie der Zyklus auf Monate verteilt wird, und ob mehrere Budgetposten auf einer
   Kategorie summiert werden. Vorschlag: zuerst in ein eigenes Szenario „Einkauf-App“ schreiben,
   Finanzen übernimmt von dort.
4. **Technischer Zugang.** Der Connector meldet eine Person per Anmeldung an und eignet sich für
   Claude, nicht für den App-Server. Für die App brauchen wir ein technisches Agicap-Konto bzw.
   einen API-Zugang mit genau den Rechten aus Punkt 1–3. Ob das über den MCP-Server oder die
   Agicap-REST-API läuft, klären wir mit Agicap.

## Offene Fragen an Finanzen

1. Sind die Budgets in Agicap **brutto** gepflegt? Die MwSt.-Automatik scheint aus zu sein, und
   die Kategorien haben fast keinen MwSt.-Satz.
2. Passt die Zuordnung Team → Oberkategorie (Material-, Bausystem-, Produktionsentwicklung)? Wohin
   gehören Einkäufe für Verwaltung, Software oder Projekte wie SEMBLA?
3. Soll die App erwartete Zahlungen schreiben dürfen, und in welches Szenario (Hauptszenario oder
   ein eigenes)? Wer löscht sie, wenn die Rechnung bezahlt ist?
4. Welches Zahlungsziel setzen wir als Standard für das erwartete Zahlungsdatum?
5. Kann Agicap „Expected transactions on synchronized accounts“ für uns freischalten?
6. Gibt es ein technisches Agicap-Konto bzw. einen API-Zugang für den App-Server, und wer
   verwaltet die Rechte?
7. Kartenzahlungen (Agicap Spend) laufen am Einkaufsprozess vorbei. Sollen sie in der App
   auftauchen, zum Beispiel als „ausgegeben“ je Team über den Kartennamen?
8. Können die alten überfälligen Eingangsrechnungen aus 2021 in Agicap bereinigt werden?
9. Wie werden 4-monatige OKR-Zyklen und Monatsbudgets in Agicap zusammengebracht – gleichmäßig
   verteilen oder je Monat planen?
