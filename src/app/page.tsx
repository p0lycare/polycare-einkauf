import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { knopf } from "@/lib/stil";
import { AnforderungsListe, LISTEN_SPALTEN, type ListenEintrag } from "./anforderungen/anforderungs-liste";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Auch Freigebende sehen hier nur ihre eigenen Anforderungen; die Freigabeansicht kommt separat
  const [{ data }, { data: profil }] = await Promise.all([
    supabase
      .from("anforderung")
      .select(LISTEN_SPALTEN)
      .eq("ersteller_id", user!.id)
      .order("created_at", { ascending: false })
      .returns<ListenEintrag[]>(),
    supabase.from("profile").select("team_id").eq("id", user!.id).single(),
  ]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meine Anforderungen</h1>
        <Link href="/anforderungen/neu" className={knopf}>
          Neue Anforderung
        </Link>
      </div>
      {profil && !profil.team_id && (
        <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Du bist noch keinem Team zugeordnet. Bitte melde dich bei der Verwaltung – bis dahin wählst du beim Anfordern
          selbst, für welches Team die Anforderung ist.
        </p>
      )}
      {!data?.length && (
        <p className="rounded-md bg-marke-hell p-4 text-sm text-marke-dunkel">
          Neu hier? Die{" "}
          <Link href="/hilfe" className="underline">
            Einführung
          </Link>{" "}
          zeigt in ein paar Schritten, wie Anfordern, Freigeben und Bestellen funktioniert – passend zu deiner Rolle.
        </p>
      )}
      <AnforderungsListe
        eintraege={(data ?? []).map((a) => ({ ...a, ersteller: null }))}
        leerText="Noch keine Anforderungen angelegt."
      />
    </main>
  );
}
