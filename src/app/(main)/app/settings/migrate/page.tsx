import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

async function runMigration() {
  "use server";

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's station and role
  const { data: membership } = await supabase
    .from("memberships")
    .select("station_id, role")
    .eq("user_id", user.id)
    .single<{ station_id: string; role: string }>();

  if (!membership || membership.role !== "ADMIN") {
    return redirect("/admin/settings?error=Keine Berechtigung.");
  }

  // Try to create a test template to see if the constraint is still there
  const testLabel = `TEST_${Date.now()}`;
  const { error } = await supabase
    .from("shift_templates")
    .insert({
      station_id: membership.station_id,
      label: testLabel,
      start_time: "07:00",
      end_time: "19:00",
    } as any);

  // Clean up test template
  if (!error) {
    await supabase
      .from("shift_templates")
      .delete()
      .eq("station_id", membership.station_id)
      .eq("label", testLabel);
  }

  if (error) {
    if (error.message.includes("violates check constraint")) {
      return redirect(
        "/admin/settings/migrate?error=" +
          encodeURIComponent(
            "Die Migration muss noch im Supabase Dashboard ausgeführt werden. Siehe Anleitung unten."
          )
      );
    }
    return redirect(
      "/admin/settings/migrate?error=" + encodeURIComponent(error.message)
    );
  }

  return redirect(
    "/admin/settings?success=" +
      encodeURIComponent(
        "Migration erfolgreich! Sie können jetzt beliebige Schicht-Namen verwenden."
      )
  );
}

export default async function MigratePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's station and role
  const { data: membership } = await supabase
    .from("memberships")
    .select("station_id, role")
    .eq("user_id", user.id)
    .single<{ station_id: string; role: string }>();

  if (!membership || membership.role !== "ADMIN") {
    return (
      <div className="py-8 px-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Sie benötigen Administrator-Rechte.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 px-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Datenbank-Migration</h1>
        <p className="text-muted-foreground">
          Aktualisierung der Schicht-Vorlagen Struktur
        </p>
      </div>

      {searchParams.error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{searchParams.error}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Migration ausführen</CardTitle>
          <CardDescription>
            Diese Migration erlaubt es Ihnen, Schicht-Vorlagen mit beliebigen
            Namen zu erstellen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-medium">Was wird geändert?</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li>
                Entfernt die Einschränkung, dass nur &apos;DAY&apos; und &apos;NIGHT&apos; als
                Schicht-Namen erlaubt sind
              </li>
              <li>
                Ermöglicht beliebige Schicht-Namen (z.B. &quot;Tagesdienst&quot;,
                &quot;Nachtdienst&quot;, &quot;Bereitschaft&quot;)
              </li>
              <li>Behält die Unique-Constraint bei (keine Duplikate)</li>
            </ul>
          </div>

          <form action={runMigration}>
            <Button type="submit" className="w-full">
              Migration durchführen
            </Button>
          </form>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-2">
              Falls die automatische Migration nicht funktioniert:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Öffnen Sie das Supabase Dashboard</li>
              <li>Gehen Sie zu SQL Editor</li>
              <li>Führen Sie folgendes SQL aus:</li>
            </ol>
            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
              {`ALTER TABLE "public"."shift_templates"
DROP CONSTRAINT IF EXISTS "shift_templates_label_check";

ALTER TABLE "public"."shift_templates"
DROP CONSTRAINT IF EXISTS "shift_templates_station_id_label_key";

ALTER TABLE "public"."shift_templates"
ADD CONSTRAINT "shift_templates_station_id_label_key"
UNIQUE ("station_id", "label");`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Link href="/admin/settings" className="flex-1">
          <Button variant="outline" className="w-full">
            Zurück zu Einstellungen
          </Button>
        </Link>
      </div>
    </div>
  );
}
