import { describe, expect, it } from "vitest";
import { einfuehrung, ROLLEN, rollenVon } from "./einfuehrung";

const niemand = { ist_gf: false, ist_einkauf: false, ist_finanzen: false, ist_admin: false, leitet: [] as string[] };

describe("rollenVon", () => {
  it("alle sind Mitarbeitende", () => {
    expect(rollenVon(niemand)).toEqual(["mitarbeitende"]);
  });

  it("Teamleitung ergibt sich aus geleiteten Teams", () => {
    expect(rollenVon({ ...niemand, leitet: ["t1"] })).toEqual(["mitarbeitende", "teamleitung"]);
  });

  it("mehrere Rollen in fester Reihenfolge", () => {
    expect(rollenVon({ ...niemand, ist_admin: true, ist_gf: true, ist_einkauf: true })).toEqual([
      "mitarbeitende",
      "gf",
      "einkauf",
      "admin",
    ]);
  });
});

describe("einfuehrung", () => {
  it("hat für jede Rolle Titel und Schritte", () => {
    const texte = einfuehrung("1.000,00 €");
    for (const rolle of ROLLEN) {
      expect(texte[rolle].titel).not.toBe("");
      expect(texte[rolle].schritte.length).toBeGreaterThan(0);
    }
  });

  it("nennt die aktuelle Freigabegrenze", () => {
    expect(einfuehrung("2.500,00 €").teamleitung.schritte.map((s) => s.text).join(" ")).toContain("2.500,00 €");
  });
});
