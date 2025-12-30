import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
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
import { updateShiftComplete } from "@/lib/actions/shifts.actions";
import { Database } from "@/types";

type ShiftAssignment = {
  id: string;
  vehicle_key: string;
  slot_key: string;
  person_id: string | null;
  from_trupp_key: string | null;
  placeholder_text: string | null;
};

type ShiftWithRelations = Database["public"]["Tables"]["shifts"]["Row"] & {
  division: { id: string; name: string };
  assignments: ShiftAssignment[];
};

export default async function EditShiftPage({
  params,
  searchParams,
}: {
  params: { id: string };
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
    .single<{
      station_id: string;
      role: "ADMIN" | "EDITOR" | "VIEWER";
      division_ids: string[] | null;
    }>();

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

  // Get shift details
  const { data: shift } = await supabase
    .from("shifts")
    .select<ShiftWithRelations>(`
      *,
      division:divisions(id, name),
      assignments:assignments(id, vehicle_key, slot_key, person_id, from_trupp_key, placeholder_text)
    `)
    .eq("id", params.id)
    .eq("station_id", membership.station_id)
    .single();

  if (!shift) {
    notFound();
  }

  // Check if EDITOR has access to this division
  if (membership.role === "EDITOR") {
    const userDivisions = membership.division_ids || [];
    if (!userDivisions.includes(shift.division_id)) {
      return (
        <div className="py-8 px-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Zugriff verweigert</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Sie haben keinen Zugriff auf Schichten dieser Division.</p>
            </CardContent>
          </Card>
        </div>
      );
    }
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

  // Format existing assignments for the component
  // Group assignments by vehicle_id
  const vehicleMap = new Map();
  const vehicleKeyToConfig = new Map();
  vehicles?.forEach((v) => {
    vehicleMap.set(v.key, v.id);
    vehicleKeyToConfig.set(v.key, v);
  });

  const existingAssignments: any = {};
  const existingCopiedTrupps: any = {};
  const existingPraktikantFlags: any = {};
  const existingTruppPraktikantFlags: any = {};

  console.log('Edit page - shift.assignments:', shift.assignments);

  // Reconstruct copied trupps from assignments with from_trupp_key
  const copiedTruppsMap = new Map<string, Set<string>>(); // target vehicle -> set of copied trupp names

  shift.assignments?.forEach((assignment: any) => {
    const vehicleId = vehicleMap.get(assignment.vehicle_key);
    if (!vehicleId) return;

    // Check if this is a copied trupp assignment
    if (assignment.from_trupp_key) {
      // This assignment is part of a copied trupp
      const slotKey = assignment.slot_key;
      if (slotKey.includes(':')) {
        const targetTruppKey = slotKey.split(':')[0];
        const mapKey = `${vehicleId}:${targetTruppKey}`;

        if (!copiedTruppsMap.has(mapKey)) {
          copiedTruppsMap.set(mapKey, new Set());

          // Find the source vehicle that has this trupp
          const sourceTruppKey = assignment.from_trupp_key;
          let sourceVehicleId = null;

          // Look through all vehicles to find which one has this trupp in its config
          vehicles?.forEach((v) => {
            const config = v.config as any;
            if (config.trupps?.some((t: any) => t.key === sourceTruppKey)) {
              sourceVehicleId = v.id;
            }
          });

          if (sourceVehicleId) {
            if (!existingCopiedTrupps[vehicleId]) {
              existingCopiedTrupps[vehicleId] = [];
            }
            existingCopiedTrupps[vehicleId].push({
              sourceVehicleId,
              sourceTruppKey,
              targetTruppKey
            });
          }
        }
        copiedTruppsMap.get(mapKey)!.add(assignment.from_trupp_key);
      }
    }

    // Check if this is a praktikant placeholder assignment (vehicle-level)
    // Only set this flag if the vehicle has NO trupps (otherwise praktikanten belong to trupps)
    if (assignment.slot_key === 'Praktikant' || assignment.placeholder_text === 'Praktikant') {
      const vehicle = vehicleKeyToConfig.get(assignment.vehicle_key);
      const vehicleConfig = vehicle?.config as any;
      // Only allow vehicle-level praktikant if no trupps exist
      if (!vehicleConfig?.trupps || vehicleConfig.trupps.length === 0) {
        existingPraktikantFlags[vehicleId] = true;
      }
    }

    // Check if this is a trupp praktikant placeholder assignment
    // Slot key format: "Trupp 1:Praktikant" or "Trupp 2:Praktikant"
    if (assignment.slot_key && assignment.slot_key.includes(':')) {
      const parts = assignment.slot_key.split(':');
      if (parts.length === 2 && parts[1] === 'Praktikant') {
        const truppKey = parts[0];
        if (!existingTruppPraktikantFlags[vehicleId]) {
          existingTruppPraktikantFlags[vehicleId] = {};
        }
        existingTruppPraktikantFlags[vehicleId][truppKey] = true;
      }
    }

    // Add to regular assignments
    if (!existingAssignments[vehicleId]) {
      existingAssignments[vehicleId] = {};
    }
    existingAssignments[vehicleId][assignment.slot_key] = assignment.person_id;
  });

  console.log('Edit page - existingAssignments:', existingAssignments);
  console.log('Edit page - existingCopiedTrupps:', existingCopiedTrupps);
  console.log('Edit page - existingPraktikantFlags:', existingPraktikantFlags);
  console.log('Edit page - existingTruppPraktikantFlags:', existingTruppPraktikantFlags);

  // Format dates for inputs - treat as local time, not UTC
  const formatDate = (date: string) => {
    // Extract just the date part without timezone conversion
    return date.split('T')[0];
  };

  const formatTime = (date: string) => {
    // Extract just the time part without timezone conversion
    const timePart = date.split('T')[1];
    if (timePart) {
      const [hours, minutes] = timePart.split(':');
      return `${hours}:${minutes}`;
    }
    return '00:00';
  };

  return (
    <div className="py-8 px-6">
      <div className="mb-6">
        <Link href="/app/shifts">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Schicht bearbeiten</h1>
        <p className="text-muted-foreground">
          Bearbeiten Sie den Dienstplan für diese Schicht
        </p>
      </div>

      {searchParams.error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{searchParams.error}</p>
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

      <form action={updateShiftComplete} className="space-y-6">
        <input type="hidden" name="shift_id" value={shift.id} />

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
                defaultValue={formatDate(shift.starts_at)}
              />
            </div>

            <ShiftTypeSelector
              templates={templates || []}
              defaultStartTime={formatTime(shift.starts_at)}
              defaultEndTime={formatTime(shift.ends_at)}
            />

            <div className="grid gap-2">
              <Label htmlFor="shift-division">Wachabteilung *</Label>
              <select
                id="shift-division"
                name="division_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                required
                defaultValue={shift.division_id}
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
                defaultChecked={shift.wachleitung_im_haus}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="wachleitung-im-haus" className="cursor-pointer">
                Wachleitung im Haus
              </Label>
            </div>
          </CardContent>
        </Card>

        <ShiftAssignmentComplete
          vehicles={vehicles || []}
          people={people || []}
          initialAssignments={existingAssignments}
          initialCopiedTrupps={existingCopiedTrupps}
          initialPraktikantFlags={existingPraktikantFlags}
          initialTruppPraktikantFlags={existingTruppPraktikantFlags}
        />

        <div className="flex gap-4 justify-end">
          <Link href="/app/shifts">
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </Link>
          <Button type="submit">
            Änderungen speichern
          </Button>
        </div>
      </form>
    </div>
  );
}
