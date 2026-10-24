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
  const { data } = await supabase
    .from("anforderung")
    .select(LISTEN_SPALTEN)
    .eq("ersteller_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<ListenEintrag[]>();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meine Anforderungen</h1>
        <Link href="/anforderungen/neu" className={knopf}>
          Neue Anforderung
        </Link>
      </div>
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
