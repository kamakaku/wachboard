import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { ShiftAssignmentComplete } from "@/components/admin/shift-assignment-complete";
import { ShiftTypeSelector } from "@/components/admin/shift-type-selector";
import { createShift } from "@/lib/actions/shifts.actions";

export default async function NewShiftPage({
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
    .select("station_id, role, division_ids")
    .eq("user_id", user.id)
    .single();

  if (!membership || !["ADMIN", "EDITOR"].includes(membership.role)) {
    return (
      <div className="py-8 px-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Sie benötigen Editor- oder Administrator-Rechte.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get divisions - filter by user's assigned divisions if EDITOR
  let divisionsQuery = supabase
    .from("divisions")
    .select("*")
    .eq("station_id", membership.station_id);

  if (membership.role === "EDITOR" && membership.division_ids && membership.division_ids.length > 0) {
    divisionsQuery = divisionsQuery.in("id", membership.division_ids);
  }

  const { data: divisions } = await divisionsQuery.order("name", { ascending: true });

  // Get vehicles
  const { data: vehicles } = await supabase
    .from("vehicle_configs")
    .select("*")
    .eq("station_id", membership.station_id)
    .order("order", { ascending: true });

  // Get people
  const { data: people } = await supabase
    .from("people")
    .select("*")
    .eq("station_id", membership.station_id)
    .eq("active", true)
    .order("name", { ascending: true });

  // Get shift templates
  const { data: templates } = await supabase
    .from("shift_templates")
    .select("*")
    .eq("station_id", membership.station_id)
    .order("label", { ascending: true });

  return (
    <div className="py-8 px-6">
      <div className="mb-6">
        <Link href="/app/shifts">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Neue Schicht erstellen</h1>
        <p className="text-muted-foreground">
          Erstellen Sie einen Dienstplan für eine Schicht und weisen Sie Personal zu
        </p>
      </div>

      {searchParams.error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive mb-3">{searchParams.error}</p>
            {searchParams.error.includes('existiert bereits') && (
              <Link href="/app/shifts">
                <Button variant="outline" size="sm">
                  Zur Schicht-Übersicht
                </Button>
              </Link>
            )}
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

      <form action={createShift} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Schicht-Details</CardTitle>
            <CardDescription>
              Grundlegende Informationen zur Schicht
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="shift-date">Datum *</Label>
              <Input
                id="shift-date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>

            <ShiftTypeSelector templates={templates || []} />
            <div className="grid gap-2">
              <Label htmlFor="shift-division">Wachabteilung *</Label>
              <select
                id="shift-division"
                name="division_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                required
              >
                <option value="">Wählen Sie eine Wachabteilung</option>
                {divisions?.map((division: any) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="wachleitung-im-haus"
                name="wachleitung_im_haus"
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="wachleitung-im-haus" className="text-sm font-normal cursor-pointer">
                Wachleitung im Haus
              </Label>
            </div>
          </CardContent>
        </Card>

        <ShiftAssignmentComplete
          vehicles={vehicles || []}
          people={people || []}
        />

        <div className="flex gap-4 justify-end">
          <Link href="/app/shifts">
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </Link>
          <Button type="submit">
            Schicht erstellen
          </Button>
        </div>
      </form>
    </div>
  );
}
