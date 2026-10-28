/** Rückmeldungen nach einem Workflow-Schritt; die URL trägt nur den Schlüssel, nie freien Text */
export const ERLEDIGT = {
  eingereicht_tl: "Eingereicht – deine Teamleitung bekommt eine Mail und entscheidet.",
  eingereicht_gf: "Eingereicht – die Geschäftsführung bekommt eine Mail und entscheidet.",
  zurueckgezogen: "Zurückgezogen – du kannst die Anforderung jetzt bearbeiten und erneut einreichen.",
  freigegeben_gf: "Freigegeben – die Anforderung geht jetzt an die Geschäftsführung.",
  freigegeben: "Freigegeben – der Einkauf und die anfordernde Person sind informiert.",
  abgelehnt: "Abgelehnt – die anfordernde Person bekommt eine Mail mit deinem Grund.",
  bestellt: "Als bestellt markiert – die anfordernde Person bekommt eine Mail.",
} as const;

export type Erledigt = keyof typeof ERLEDIGT;

export function istErledigt(wert: string | undefined): wert is Erledigt {
  return !!wert && wert in ERLEDIGT;
}
