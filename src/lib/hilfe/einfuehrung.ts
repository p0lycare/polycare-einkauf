import type { Ich } from "@/lib/einkauf/ich";
import { LANGE_WARTEZEIT_TAGE } from "@/lib/einkauf/uebersicht";

/** Rollen in der Reihenfolge, in der die Einführung sie zeigt. Mitarbeitende sind alle. */
export const ROLLEN = ["mitarbeitende", "teamleitung", "gf", "einkauf", "finanzen", "admin"] as const;
export type Rolle = (typeof ROLLEN)[number];

export type Schritt = { titel: string; text: string };
export type Einfuehrung = { titel: string; kurz: string; schritte: Schritt[] };

/** Welche Teile der Einführung für mich gelten. */
export function rollenVon(ich: Pick<Ich, "ist_gf" | "ist_einkauf" | "ist_finanzen" | "ist_admin" | "leitet">): Rolle[] {
  const hat: Record<Rolle, boolean> = {
    mitarbeitende: true,
    teamleitung: ich.leitet.length > 0,
    gf: ich.ist_gf,
    einkauf: ich.ist_einkauf,
    finanzen: ich.ist_finanzen,
    admin: ich.ist_admin,
  };
  return ROLLEN.filter((r) => hat[r]);
}

/** Texte der Einführung je Rolle; `grenze` ist die Freigabegrenze, z. B. "1.000,00 €". */
export function einfuehrung(grenze: string): Record<Rolle, Einfuehrung> {
  return {
    mitarbeitende: {
      titel: "Für alle: etwas bestellen lassen",
      kurz: "Du brauchst etwas für die Arbeit? So kommt es über eine Anforderung zur Bestellung.",
      schritte: [
        {
          titel: "Anmelden",
          text: "Mit deinem Polycare-Microsoft-Konto. Beim ersten Mal ordnet dich die Verwaltung deinem Team zu. Bis dahin musst du im Formular selbst wählen, für welches Team du anforderst.",
        },
        {
          titel: "Neue Anforderung anlegen",
          text: "Auf der Startseite „Neue Anforderung“. Lade das Angebot als PDF oder Foto hoch: Claude liest Lieferant, Artikel, Betrag und Link aus und füllt das Formular vor. Bitte alles kurz prüfen.",
        },
        {
          titel: "Budgetposten wählen",
          text: "Wähle den Posten deines Teams, aus dem bezahlt wird. Passt keiner, nimm „kein Budgetposten (außerplanmäßig)“ – dann entscheidet immer die Geschäftsführung. Alle Beträge brutto.",
        },
        {
          titel: "Speichern und einreichen",
          text: "„Speichern“ legt einen Entwurf an, den nur du siehst. Erst „Zur Freigabe einreichen“ schickt ihn los – deine Teamleitung bekommt eine Mail.",
        },
        {
          titel: "Rückmeldung abwarten",
          text: "Du bekommst eine Mail, wenn freigegeben, abgelehnt oder bestellt wurde. Bei einer Ablehnung steht der Grund dabei: anpassen und neu einreichen. Solange die Anforderung in der Freigabe ist, geht „Zurückziehen und bearbeiten“ – eine schon erteilte Freigabe der Teamleitung verfällt dann.",
        },
        {
          titel: "Budget im Blick",
          text: "Unter „Budget“ siehst du für dein Team je Posten: geplant, gebunden (freigegeben oder bestellt) und verfügbar.",
        },
      ],
    },
    teamleitung: {
      titel: "Teamleitung: freigeben und planen",
      kurz: "Du gibst die Anforderungen deines Teams frei und planst sein Budget.",
      schritte: [
        {
          titel: "Freigaben",
          text: "Bei jeder neuen Anforderung kommt eine Mail mit Link. Alles Offene steht unter „Freigaben“, die Zahl daneben zeigt, wie viel wartet.",
        },
        {
          titel: "Prüfen und entscheiden",
          text: "Angebot, Betrag und Budgetposten ansehen, dann „Freigeben“ oder „Ablehnen“. Für eine Ablehnung ist ein Grund Pflicht – die anfordernde Person sieht ihn. Ein gelber Hinweis „Mögliche Stückelung“ zeigt, wenn es beim selben Lieferanten kurz zuvor weitere Anforderungen gab, die zusammen über der Freigabegrenze liegen.",
        },
        {
          titel: "Wann die Geschäftsführung dazukommt",
          text: `Bis einschließlich ${grenze} brutto genügt deine Freigabe – die Anforderung geht dann direkt an den Einkauf. Darüber und bei außerplanmäßigen Anforderungen entscheidet nach dir die Geschäftsführung. Deine eigenen Anforderungen gibt immer die Geschäftsführung frei.`,
        },
        {
          titel: "Budget planen",
          text: "Unter „Planung“ legst du die Budgetposten deines Teams an, solange die Periode „In Planung“ ist – mit Betrag brutto und passendem Key Result. Ist die Periode aktiv, ändert nur noch Finanzen.",
        },
      ],
    },
    gf: {
      titel: "Geschäftsführung: große und außerplanmäßige Ausgaben",
      kurz: "Du entscheidest über alles oberhalb der Freigabegrenze und alles ohne Budgetposten.",
      schritte: [
        {
          titel: "Freigaben",
          text: `Nach der Teamleitung landen bei dir Anforderungen über ${grenze} brutto, außerplanmäßige und die Anforderungen der Teamleitungen selbst. Du bekommst eine Mail; unter „Freigaben“ steht oben, was auf dich wartet. Darunter siehst du, was noch bei einer Teamleitung liegt – das kannst du bei Bedarf vertreten.`,
        },
        {
          titel: "Entscheiden",
          text: "„Freigeben“ schickt die Anforderung an den Einkauf, „Ablehnen“ braucht einen Grund. Deine eigenen Anforderungen gibt eine andere Person aus der Geschäftsführung frei.",
        },
        {
          titel: "Überblick",
          text: `Unter „Übersicht“ siehst du auf einen Blick alle Teams mit Budget und Auslastung, alle offenen Freigaben mit Wartezeit (rot ab ${LANGE_WARTEZEIT_TAGE} Tagen), mögliche Stückelungen und alle außerplanmäßigen Anforderungen. Von dort geht es zur Auswertung je Key Result. Einzelne Budgetposten stehen unter „Budget“.`,
        },
      ],
    },
    einkauf: {
      titel: "Einkauf: freigegebene Anforderungen bestellen",
      kurz: "Du bestellst, was endgültig freigegeben ist.",
      schritte: [
        {
          titel: "Was zu bestellen ist",
          text: "Nach der letzten Freigabe kommt eine Mail. Unter „Einkauf“ steht alles, was auf die Bestellung wartet. In der Anforderung findest du Angebot, Lieferant und Link.",
        },
        {
          titel: "Bestellen und abhaken",
          text: "Beim Lieferanten bestellen, dann die Bestellnummer eintragen und „Als bestellt markieren“. Die anfordernde Person bekommt eine Mail.",
        },
      ],
    },
    finanzen: {
      titel: "Finanzen: Perioden, Key Results und Budgets",
      kurz: "Du legst den Rahmen fest, in dem alle anfordern.",
      schritte: [
        {
          titel: "Perioden",
          text: "Unter „Planung“ eine Periode anlegen, z. B. „Q1 2027“. In Planung: Teamleitungen pflegen ihr Budget. Aktiv: Anforderungen sind möglich. Abgeschlossen: Restbudget verfällt.",
        },
        {
          titel: "Vorperiode kopieren",
          text: "Für eine neue Periode in Planung lassen sich Key Results und Budgetposten einer früheren Periode als Vorlage übernehmen. Danach die Beträge anpassen.",
        },
        {
          titel: "Key Results und Budgets",
          text: "Key Results anlegen (teamübergreifend oder je Team) und Budgetposten aller Teams pflegen – auch dann, wenn die Periode schon aktiv ist.",
        },
        {
          titel: "Übersicht",
          text: "Unter „Übersicht“ stehen Summen und Auslastung aller Teams, offene Freigaben und außerplanmäßige Ausgaben der Periode. „Auswertung je Key Result“ vergleicht Plan und Ausgaben je Key Result – für die OKR-Retro, auch als CSV für Excel.",
        },
      ],
    },
    admin: {
      titel: "Admin: Personen, Teams und Einstellungen",
      kurz: "Du sorgst dafür, dass alle richtig eingerichtet sind.",
      schritte: [
        {
          titel: "Neue Kolleginnen und Kollegen",
          text: "Wer sich zum ersten Mal anmeldet, erscheint unter „Verwaltung“ → Personen. Dort Team zuordnen und Rollen vergeben: Geschäftsführung, Einkauf, Finanzen, Admin.",
        },
        {
          titel: "Teams",
          text: "Teams anlegen und je Team eine Teamleitung festlegen. Die Teamleitung gibt frei und plant das Budget. Ohne Teamleitung gehen Anforderungen direkt an die Geschäftsführung. Mit „Nur Mitglieder fordern an“ (z. B. beim Team Geschäftsführung) können nur Personen aus dem Team dafür anfordern.",
        },
        {
          titel: "Einstellungen und Mail",
          text: `Die Freigabegrenze (zurzeit ${grenze} brutto) legt fest, ab wann die Geschäftsführung entscheidet. Mit „Testmail an mich senden“ prüfst du den Mailversand, das Protokoll zeigt jede verschickte Mail.`,
        },
      ],
    },
  };
}
