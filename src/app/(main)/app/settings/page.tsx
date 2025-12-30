import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShiftTemplateManager } from "@/components/admin/shift-template-manager";
import { StationSettingsForm } from "@/components/admin/station-settings-form";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
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
    .single();

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

  // Get shift templates
  const { data: templates } = await supabase
    .from("shift_templates")
    .select("*")
    .eq("station_id", membership.station_id)
    .order("label", { ascending: true });

  // Get station info
  const { data: station } = await supabase
    .from("stations")
    .select("id, name, crest_url")
    .eq("id", membership.station_id)
    .single();

  return (
    <div className="py-8 px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihre Wache und Schicht-Vorlagen
        </p>
      </div>

      {searchParams.error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-destructive">{searchParams.error}</p>
                {searchParams.error.includes("Fehler beim Erstellen") && (
                  <div className="mt-3">
                    <Link href="/admin/settings/migrate">
                      <Button variant="outline" size="sm">
                        Migration durchführen
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {searchParams.success && (
        <Card className="mb-6 border-green-500">
          <CardContent className="pt-6">
            <p className="text-green-600">{searchParams.success}</p>
          </CardContent>
        </Card>
      )}

      {/* Station Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Wache-Einstellungen</CardTitle>
          <CardDescription>
            Grundlegende Informationen zu Ihrer Wache
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StationSettingsForm
            stationId={station?.id || ''}
            currentName={station?.name || ''}
            currentCrestUrl={station?.crest_url || null}
          />
        </CardContent>
      </Card>

      <ShiftTemplateManager templates={templates || []} />
    </div>
  );
}
