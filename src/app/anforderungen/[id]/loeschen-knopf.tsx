"use client";

import { anforderungLoeschen } from "../actions";

/** Entwurf löschen – nur nach Rückfrage, weil auch die Angebotsdateien endgültig weg sind */
export function LoeschenKnopf({ id, nr }: { id: string; nr: string }) {
  return (
    <form
      action={anforderungLoeschen}
      onSubmit={(e) => {
        if (!confirm(`Entwurf ${nr} endgültig löschen? Das angehängte Angebot wird mit gelöscht.`)) e.preventDefault();
      }}
      className="ml-auto"
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="px-3 py-2 text-sm text-red-700 hover:underline dark:text-red-400">
        Entwurf löschen
      </button>
    </form>
  );
}
