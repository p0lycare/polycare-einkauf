import { describe, expect, it } from "vitest";
import { alsVorschlag, type AngebotRoh } from "./angebot-schema";

const roh: AngebotRoh = {
  ist_angebot: true,
  lieferant: "Laborhandel GmbH",
  titel: "Präzisionswaage",
  beschreibung: "1 × Waage XY, Art.-Nr. 4711, 1.049,58 €",
  betrag_brutto: 1249.0,
  waehrung: "EUR",
  angebotsnummer: "AN-2026-118",
  gueltig_bis: "2026-11-30",
  link: "https://shop.example/waage",
  hinweis: null,
};

describe("alsVorschlag", () => {
  it("rechnet in Cent und hängt Angebotsnummer und Gültigkeit an die Beschreibung", () => {
    const v = alsVorschlag(roh);
    expect(v.betragCent).toBe(124900);
    expect(v.beschreibung).toBe("1 × Waage XY, Art.-Nr. 4711, 1.049,58 €\nAngebotsnummer: AN-2026-118\nGültig bis: 2026-11-30");
  });

  it("übernimmt keine Fremdwährung als Eurobetrag", () => {
    expect(alsVorschlag({ ...roh, waehrung: "USD" }).betragCent).toBeNull();
  });

  it("verwirft Links ohne http(s)", () => {
    expect(alsVorschlag({ ...roh, link: "javascript:alert(1)" }).link).toBeNull();
  });

  it("leere Beschreibung bleibt null", () => {
    expect(alsVorschlag({ ...roh, beschreibung: null, angebotsnummer: null, gueltig_bis: null }).beschreibung).toBeNull();
  });
});
