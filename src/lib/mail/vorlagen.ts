export type Anlass = "zur_freigabe" | "freigegeben" | "zum_bestellen" | "abgelehnt" | "bestellt";

export type VorlageDaten = {
  nr: string;
  titel: string;
  betrag: string;
  team: string;
  anfordernd: string;
  link: string;
  handelnd?: string;
  /** Freigabe durch die GF statt Teamleitung */
  stufeGf?: boolean;
  ausserplanmaessig?: boolean;
  grund?: string;
  bestellnummer?: string;
};

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Betreff und Text je Anlass. Empfänger: siehe Funktion mail_empfaenger in der Datenbank. */
export function vorlage(anlass: Anlass, d: VorlageDaten): { betreff: string; zeilen: string[]; knopf: string } {
  const was = `${d.nr} „${d.titel}“ (${d.betrag}, ${d.team})`;
  switch (anlass) {
    case "zur_freigabe":
      return {
        betreff: `Freigabe${d.stufeGf ? " GF" : ""}: ${d.titel} – ${d.betrag}`,
        zeilen: [
          d.handelnd && d.handelnd !== d.anfordernd
            ? `${d.handelnd} hat die Anforderung ${was} von ${d.anfordernd} freigegeben. Sie braucht zusätzlich die Freigabe der Geschäftsführung.`
            : `${d.anfordernd} bittet um Freigabe für ${was}.`,
          ...(d.ausserplanmaessig ? ["Die Anforderung ist außerplanmäßig: kein Budgetposten oder über dem verfügbaren Budget."] : []),
        ],
        knopf: "Anforderung prüfen",
      };
    case "freigegeben":
      return {
        betreff: `Freigegeben: ${d.titel}`,
        zeilen: [`${d.handelnd} hat deine Anforderung ${was} freigegeben. Der Einkauf kümmert sich um die Bestellung.`],
        knopf: "Anforderung öffnen",
      };
    case "zum_bestellen":
      return {
        betreff: `Zu bestellen: ${d.titel} – ${d.betrag}`,
        zeilen: [`Die Anforderung ${was} von ${d.anfordernd} ist freigegeben und kann bestellt werden.`],
        knopf: "Anforderung öffnen",
      };
    case "abgelehnt":
      return {
        betreff: `Abgelehnt: ${d.titel}`,
        zeilen: [
          `${d.handelnd} hat deine Anforderung ${was} abgelehnt.`,
          `Grund: ${d.grund}`,
          "Du kannst die Anforderung anpassen und erneut einreichen.",
        ],
        knopf: "Anforderung öffnen",
      };
    case "bestellt":
      return {
        betreff: `Bestellt: ${d.titel}`,
        zeilen: [`${d.handelnd} hat deine Anforderung ${was} bestellt${d.bestellnummer ? ` (Bestellnummer ${d.bestellnummer})` : ""}.`],
        knopf: "Anforderung öffnen",
      };
  }
}

export function alsMail(anlass: Anlass, d: VorlageDaten): { betreff: string; text: string; html: string } {
  const { betreff, zeilen, knopf } = vorlage(anlass, d);
  const text = [...zeilen, "", `${knopf}: ${d.link}`, "", "– Polycare Einkauf"].join("\n");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#171717;line-height:1.5">
${zeilen.map((z) => `<p>${escape(z)}</p>`).join("\n")}
<p><a href="${escape(d.link)}" style="display:inline-block;background:#171717;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escape(knopf)}</a></p>
<p style="color:#737373;font-size:13px">Polycare Einkauf</p>
</body></html>`;
  return { betreff, text, html };
}
