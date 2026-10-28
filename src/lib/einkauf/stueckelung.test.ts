import { describe, expect, it } from "vitest";
import { normalisiereLieferant, stueckelungsGruppen, stueckelungZu, type StueckelungsKandidat } from "./stueckelung";

const GRENZE = 100000;
let nr = 0;
const anf = (lieferant: string | null, betrag: number, tag: string, team = "t1"): StueckelungsKandidat => ({
  id: `a${++nr}`,
  nr,
  titel: `Anforderung ${nr}`,
  team_id: team,
  lieferant,
  betrag_cent: betrag,
  eingereicht_am: `2026-10-${tag}T10:00:00Z`,
  created_at: `2026-10-${tag}T09:00:00Z`,
});

describe("normalisiereLieferant", () => {
  it("ignoriert Groß-/Kleinschreibung, Satzzeichen und Rechtsformen", () => {
    expect(normalisiereLieferant("Müller GmbH & Co. KG")).toBe("müller");
    expect(normalisiereLieferant(" müller gmbh. ")).toBe("müller");
    expect(normalisiereLieferant("Carl Roth GmbH + Co. KG")).toBe("carl roth");
  });
  it("bleibt leer ohne Lieferant", () => {
    expect(normalisiereLieferant(null)).toBe("");
  });
});

describe("stueckelungZu", () => {
  it("meldet zwei Anforderungen knapp unter der Grenze beim selben Lieferanten", () => {
    const a = anf("Müller GmbH", 95000, "20");
    const b = anf("müller gmbh.", 90000, "05");
    const ergebnis = stueckelungZu(a, [b], GRENZE);
    expect(ergebnis?.treffer.map((k) => k.id)).toEqual([b.id]);
    expect(ergebnis?.summeCent).toBe(185000);
  });

  it("schweigt, wenn die Summe unter der Grenze bleibt", () => {
    expect(stueckelungZu(anf("Müller", 40000, "20"), [anf("Müller", 30000, "18")], GRENZE)).toBeNull();
  });

  it("betrachtet nur das eigene Team, 30 Tage und Beträge bis zur Grenze", () => {
    const a = anf("Müller", 95000, "30");
    const anderesTeam = anf("Müller", 95000, "29", "t2");
    const zuAlt = { ...anf("Müller", 95000, "01"), eingereicht_am: "2026-09-25T10:00:00Z" };
    const ueberGrenze = anf("Müller", 150000, "28");
    expect(stueckelungZu(a, [anderesTeam, zuAlt, ueberGrenze], GRENZE)).toBeNull();
  });

  it("nimmt wie die Übersicht nur ein 30-Tage-Fenster, nicht ±30 Tage", () => {
    const a = anf("Müller", 40000, "15");
    const frueh = { ...anf("Müller", 40000, "01"), eingereicht_am: "2026-09-20T10:00:00Z" };
    const spaet = { ...anf("Müller", 30000, "01"), eingereicht_am: "2026-11-10T10:00:00Z" };
    const ergebnis = stueckelungZu(a, [frueh, spaet], GRENZE);
    // frueh und spaet liegen 51 Tage auseinander und passen nicht in ein Fenster
    expect(ergebnis).toBeNull();
    const dazu = stueckelungZu(a, [frueh, spaet, anf("Müller", 30000, "05")], GRENZE);
    expect(dazu?.treffer.map((k) => k.id)).toEqual([frueh.id, `a${nr}`]);
    expect(dazu?.summeCent).toBe(110000);
  });

  it("ohne Lieferant oder selbst über der Grenze kein Hinweis", () => {
    expect(stueckelungZu(anf(null, 95000, "20"), [anf(null, 95000, "19")], GRENZE)).toBeNull();
    expect(stueckelungZu(anf("Müller", 120000, "20"), [anf("Müller", 95000, "19")], GRENZE)).toBeNull();
  });
});

describe("stueckelungsGruppen", () => {
  it("findet je Team und Lieferant das auffälligste Zeitfenster", () => {
    const gruppen = stueckelungsGruppen(
      [
        anf("Roth GmbH", 60000, "02"),
        anf("roth", 55000, "10"),
        anf("Roth", 99000, "28", "t2"),
        anf("Andere AG", 99000, "15"),
      ],
      GRENZE,
    );
    expect(gruppen).toHaveLength(1);
    expect(gruppen[0]).toMatchObject({ lieferant: "Roth GmbH", team_id: "t1", summeCent: 115000 });
    expect(gruppen[0].anforderungen).toHaveLength(2);
  });
});
