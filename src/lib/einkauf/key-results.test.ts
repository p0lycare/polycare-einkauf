import { describe, expect, it } from "vitest";
import { alsCsv, auswertungJeKeyResult, centAlsCsv, type CsvAnforderung } from "./key-results";

const kr1 = { id: "k1", kuerzel: "KR 1.1", titel: "Labor modernisieren", team_id: null };
const kr2 = { id: "k2", kuerzel: "KR 1.2", titel: "Neue Linie", team_id: "t1" };

describe("auswertungJeKeyResult", () => {
  const ergebnis = auswertungJeKeyResult(
    [kr1, kr2],
    [
      { key_result_id: "k1", geplant_cent: 500000 },
      { key_result_id: "k1", geplant_cent: 100000 },
      { key_result_id: null, geplant_cent: 20000 },
    ],
    [
      { key_result_id: "k1", betrag_cent: 100000, status: "bestellt" },
      { key_result_id: "k1", betrag_cent: 50000, status: "freigegeben" },
      { key_result_id: "k1", betrag_cent: 30000, status: "bei_gf" },
      { key_result_id: "k1", betrag_cent: 99999, status: "entwurf" },
      { key_result_id: "k1", betrag_cent: 99999, status: "abgelehnt" },
      { key_result_id: null, betrag_cent: 7000, status: "bestellt" },
    ],
  );

  it("summiert Plan aus Posten und Ausgaben aus Anforderungen", () => {
    expect(ergebnis[0]).toMatchObject({
      geplant_cent: 600000,
      in_freigabe_cent: 30000,
      freigegeben_cent: 50000,
      bestellt_cent: 100000,
      gebunden_cent: 150000,
      verfuegbar_cent: 450000,
      anzahl: 3,
    });
  });

  it("zeigt Key Results ohne Bewegung mit Nullen", () => {
    expect(ergebnis[1]).toMatchObject({ kr: kr2, geplant_cent: 0, anzahl: 0 });
  });

  it("hängt „ohne Key Result“ nur an, wenn es etwas gibt", () => {
    expect(ergebnis[2]).toMatchObject({ kr: null, geplant_cent: 20000, bestellt_cent: 7000, anzahl: 1 });
    expect(auswertungJeKeyResult([kr1], [], [])).toHaveLength(1);
  });
});

describe("CSV", () => {
  it("formatiert Beträge mit Dezimalkomma ohne Tausenderpunkt", () => {
    expect(centAlsCsv(123456)).toBe("1234,56");
    expect(centAlsCsv(5)).toBe("0,05");
    expect(centAlsCsv(-1050)).toBe("-10,50");
  });

  it("schreibt Kopf, Semikolons, Anführungszeichen und BOM", () => {
    const zeile: CsvAnforderung = {
      nr: "BA-0007",
      titel: 'Waage "fein"; 0,1 mg',
      team: "Material",
      key_result: "KR 1.1",
      budgetposten: "Laborbedarf",
      lieferant: "=Müller",
      status: "Bestellt",
      betrag_cent: 124900,
      eingereicht_am: "20.10.2026",
      bestellt_am: "22.10.2026",
      bestellnummer: "4711",
    };
    const csv = alsCsv([zeile]);
    expect(csv.startsWith("﻿Key Result;Team;Nr.;")).toBe(true);
    expect(csv).toContain('KR 1.1;Material;BA-0007;"Waage ""fein""; 0,1 mg";\'=Müller;Laborbedarf;Bestellt;1249,00;');
  });
});
