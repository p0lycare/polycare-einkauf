import { describe, expect, it } from "vitest";
import { okrSetSchema, vergleiche, zyklusFuerDatum, type OkrSet } from "./okr-set";

const set: OkrSet = {
  zyklus: { kuerzel: "26Z3", beginn: "2026-09-01", ende: "2026-12-31", status: "aktiv" },
  version: { nummer: 2, eingefroren_am: "2026-10-24T14:00:00+00:00", begruendung: null },
  objective: "Wir haben …",
  key_results: [
    { id: "top1", ebene: "top", kuerzel: "KR1", titel: "Referenz", lead: "Felix", team: "Bausysteme", top_kr: null, budget_vorschlag_cent: 2100000, budget_bemerkung: "R316" },
    { id: "a", ebene: "team", kuerzel: "KR 1.1", titel: "Wand geplant", lead: null, team: "Bausysteme", top_kr: "KR1", budget_vorschlag_cent: 500000, budget_bemerkung: null },
    { id: "b", ebene: "team", kuerzel: "KR 1.2", titel: "Baustelle betreut", lead: null, team: "bausysteme", top_kr: "KR1", budget_vorschlag_cent: 1800000, budget_bemerkung: null },
    { id: "c", ebene: "team", kuerzel: "KR 2.1", titel: "Neue Messe", lead: null, team: "Vertrieb", top_kr: "KR2", budget_vorschlag_cent: null, budget_bemerkung: null },
  ],
};

describe("zyklusFuerDatum", () => {
  it("rechnet vier Monate je Zyklus", () => {
    expect(zyklusFuerDatum(new Date(2026, 0, 15))).toBe("26Z1");
    expect(zyklusFuerDatum(new Date(2026, 3, 30))).toBe("26Z1");
    expect(zyklusFuerDatum(new Date(2026, 4, 1))).toBe("26Z2");
    expect(zyklusFuerDatum(new Date(2026, 9, 28))).toBe("26Z3");
  });
});

describe("okrSetSchema", () => {
  it("akzeptiert die dokumentierte Antwort und lehnt Fremdes ab", () => {
    expect(okrSetSchema.safeParse(set).success).toBe(true);
    expect(okrSetSchema.safeParse({ ...set, zyklus: { ...set.zyklus, kuerzel: "Q4 2026" } }).success).toBe(false);
    expect(okrSetSchema.safeParse({ fehler: "x" }).success).toBe(false);
  });
});

describe("vergleiche", () => {
  it("erste Übernahme: alle Team-KRs neu, unbekannte Teams und Top-KR-Budget gemeldet", () => {
    const v = vergleiche(set, { version: null, keyResults: [] }, ["Bausysteme", "Material"]);
    expect(v.neu.map((k) => k.kuerzel)).toEqual(["KR 1.1", "KR 1.2", "KR 2.1"]);
    expect(v.unbekannteTeams).toEqual(["Vertrieb"]);
    expect(v.budgetAnTopKrs).toEqual([{ kuerzel: "KR1", cent: 2100000 }]);
    expect(v.budgetSummeCent).toBe(2300000);
  });

  it("neue Version: Änderungen, entfallene und von Hand angelegte KRs", () => {
    const v = vergleiche(
      set,
      {
        version: 1,
        keyResults: [
          { okr_id: "a", kuerzel: "KR 1.1", titel: "Wand geplant", team: "Bausysteme", okr_budget_vorschlag_cent: 500000, okr_entfallen: false },
          { okr_id: "b", kuerzel: "KR 1.2", titel: "Baustelle", team: "Bausysteme", okr_budget_vorschlag_cent: 1500000, okr_entfallen: false },
          { okr_id: "x", kuerzel: "KR 3.1", titel: "Gestrichen", team: "Material", okr_budget_vorschlag_cent: null, okr_entfallen: false },
          { okr_id: null, kuerzel: "KR 2.1", titel: "Neue Messe", team: "Vertrieb", okr_budget_vorschlag_cent: null, okr_entfallen: false },
        ],
      },
      ["Bausysteme", "Material", "Vertrieb"],
    );
    expect(v.bisherigeVersion).toBe(1);
    expect(v.neu).toEqual([]);
    expect(v.unveraendert).toBe(1);
    expect(v.geaendert).toEqual([
      { kuerzel: "KR 1.2", titel: "Baustelle betreut", team: "bausysteme", was: ["Titel", "Budgetvorschlag"] },
      { kuerzel: "KR 2.1", titel: "Neue Messe", team: "Vertrieb", was: ["wird mit dem OKR-Dashboard verknüpft"] },
    ]);
    expect(v.entfallen).toEqual([{ kuerzel: "KR 3.1", titel: "Gestrichen", team: "Material" }]);
    expect(v.unbekannteTeams).toEqual([]);
  });
});
