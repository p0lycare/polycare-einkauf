import { describe, expect, it } from "vitest";
import { auslastung, summenJeTeam, summiere, wartetTage, type BudgetZeile } from "./uebersicht";

const zeile = (team: string, posten: string | null, geplant: number, freigabe: number, gebunden: number): BudgetZeile => ({
  team_id: team,
  budgetposten_id: posten,
  geplant_cent: geplant,
  in_freigabe_cent: freigabe,
  gebunden_cent: gebunden,
  verfuegbar_cent: geplant - gebunden,
});

describe("summiere", () => {
  it("addiert alle Spalten und weist Außerplanmäßiges gesondert aus", () => {
    const s = summiere([zeile("a", "p1", 100000, 5000, 40000), zeile("a", null, 0, 0, 12000)]);
    expect(s).toEqual({
      geplant_cent: 100000,
      in_freigabe_cent: 5000,
      gebunden_cent: 52000,
      verfuegbar_cent: 48000,
      ausserplan_cent: 12000,
    });
  });
});

describe("summenJeTeam", () => {
  it("behält die Team-Reihenfolge und lässt Teams ohne Budget weg", () => {
    const teams = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const ergebnis = summenJeTeam(teams, [zeile("c", "p", 1, 0, 0), zeile("a", "p", 2, 0, 0)]);
    expect(ergebnis.map((g) => g.team.id)).toEqual(["a", "c"]);
  });
});

describe("auslastung", () => {
  it("rundet auf ganze Prozent", () => {
    expect(auslastung(summiere([zeile("a", "p", 300000, 0, 100000)]))).toBe(33);
  });
  it("ist leer ohne geplantes Budget", () => {
    expect(auslastung(summiere([zeile("a", null, 0, 0, 5000)]))).toBeNull();
  });
});

describe("wartetTage", () => {
  it("zählt angefangene Tage nicht mit", () => {
    expect(wartetTage("2026-10-20T09:00:00Z", new Date("2026-10-23T08:59:00Z"))).toBe(2);
    expect(wartetTage("2026-10-20T09:00:00Z", new Date("2026-10-23T09:00:00Z"))).toBe(3);
  });
  it("wird nie negativ", () => {
    expect(wartetTage("2026-10-24T10:00:00Z", new Date("2026-10-24T09:00:00Z"))).toBe(0);
  });
});
