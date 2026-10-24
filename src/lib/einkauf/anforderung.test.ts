import { describe, expect, it } from "vitest";
import { formatNr, freigabeweg } from "./anforderung";

describe("formatNr", () => {
  it("füllt auf vier Stellen auf", () => {
    expect(formatNr(42)).toBe("BA-0042");
    expect(formatNr(12345)).toBe("BA-12345");
  });
});

describe("freigabeweg", () => {
  const basis = { gfGrenzeCent: 100000, teamHatLeitung: true, ichLeiteTeam: false, verfuegbarCent: 500000 };

  it("bis 1.000 € reicht die Teamleitung", () => {
    expect(freigabeweg({ ...basis, betragCent: 100000 })).toEqual({ stufen: ["teamleitung"], ausserplanmaessig: false });
  });

  it("über 1.000 € zusätzlich die GF", () => {
    expect(freigabeweg({ ...basis, betragCent: 100001 }).stufen).toEqual(["teamleitung", "gf"]);
  });

  it("über dem verfügbaren Budget ist außerplanmäßig und braucht die GF", () => {
    expect(freigabeweg({ ...basis, betragCent: 30000, verfuegbarCent: 20000 })).toEqual({
      stufen: ["teamleitung", "gf"],
      ausserplanmaessig: true,
    });
  });

  it("ohne Budgetposten ist außerplanmäßig", () => {
    expect(freigabeweg({ ...basis, betragCent: 100, verfuegbarCent: null }).ausserplanmaessig).toBe(true);
  });

  it("Teamleitung selbst oder Team ohne Leitung → direkt GF", () => {
    expect(freigabeweg({ ...basis, betragCent: 100, ichLeiteTeam: true }).stufen).toEqual(["gf"]);
    expect(freigabeweg({ ...basis, betragCent: 100, teamHatLeitung: false }).stufen).toEqual(["gf"]);
  });
});
