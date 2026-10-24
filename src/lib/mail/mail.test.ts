import { describe, expect, it } from "vitest";
import { alsMail } from "./vorlagen";

const daten = {
  nr: "BA-0007",
  titel: "Waage <0,1 mg>",
  betrag: "1.249,00 €",
  team: "Material",
  anfordernd: "Erika Muster",
  link: "https://example.invalid/anforderungen/1",
  handelnd: "Erika Muster",
};

describe("alsMail", () => {
  it("Bitte um Freigabe nennt Person, Titel, Betrag und Link", () => {
    const m = alsMail("zur_freigabe", daten);
    expect(m.betreff).toBe("Freigabe: Waage <0,1 mg> – 1.249,00 €");
    expect(m.text).toContain("Erika Muster bittet um Freigabe für BA-0007");
    expect(m.text).toContain("https://example.invalid/anforderungen/1");
  });

  it("Weiterleitung an die GF nennt die Teamleitung und den Grund außerplanmäßig", () => {
    const m = alsMail("zur_freigabe", { ...daten, handelnd: "Tim Teamleitung", stufeGf: true, ausserplanmaessig: true });
    expect(m.betreff).toBe("Freigabe GF: Waage <0,1 mg> – 1.249,00 €");
    expect(m.text).toContain("Tim Teamleitung hat die Anforderung");
    expect(m.text).toContain("außerplanmäßig");
  });

  it("Ablehnung enthält den Grund", () => {
    const m = alsMail("abgelehnt", { ...daten, handelnd: "Tim Teamleitung", grund: "Bitte zweites Angebot" });
    expect(m.text).toContain("Grund: Bitte zweites Angebot");
  });

  it("Bestellung nennt die Bestellnummer", () => {
    expect(alsMail("bestellt", { ...daten, handelnd: "Silvia", bestellnummer: "PO-4711" }).text).toContain("PO-4711");
  });

  it("HTML ist escaped", () => {
    const m = alsMail("zur_freigabe", daten);
    expect(m.html).toContain("Waage &lt;0,1 mg&gt;");
    expect(m.html).not.toContain("<0,1 mg>");
  });
});
