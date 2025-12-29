import { createDivision, deleteDivision } from "@/lib/actions/division.actions";
import { updateScheduleCycle } from "@/lib/actions/schedule.actions";
import { RotationOrderBuilder } from "@/components/admin/rotation-order-builder";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DivisionActionsMenu } from "@/components/admin/division-actions-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default async function DivisionsPage({
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

  const { data: divisions } = await supabase
    .from("divisions")
    .select("*")
    .eq("station_id", membership.station_id)
    .order("name", { ascending: true });

  const { data: cycle } = await supabase
    .from("schedule_cycles")
    .select("*")
    .eq("station_id", membership.station_id)
    .maybeSingle();

  return (
    <div className="py-8 px-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dienste / Wachabteilungen</h1>
          <p className="text-muted-foreground">
            Definieren Sie die Rotation Ihrer Divisionen inklusive Rhythmus und feste Touren
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Neue Wachabteilung erstellen</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neue Wachabteilung erstellen</DialogTitle>
              <DialogDescription>
                Erstellen Sie eine neue Schichtgruppe, z. B. A‑Dienst oder B‑Dienst
              </DialogDescription>
            </DialogHeader>
            <form action={createDivision} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="create-division-name">Name *</Label>
                <Input
                  id="create-division-name"
                  name="name"
                  required
                  placeholder="z. B. A-Dienst"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-division-color">Farbe</Label>
                <Input
                  id="create-division-color"
                  name="color"
                  type="color"
                  defaultValue="#ff0000"
                />
              </div>
              <DialogFooter>
                <Button type="submit">
                  Wachabteilung erstellen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {searchParams.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{searchParams.error}</AlertDescription>
        </Alert>
      )}
      {searchParams.success && (
        <Alert className="mb-6 border-green-500">
          <AlertTitle>Erfolg</AlertTitle>
          <AlertDescription>{searchParams.success}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Rotation & Zyklus</CardTitle>
          <CardDescription>
            Definieren Sie, wann welche Wachabteilung dran ist
          </CardDescription>
        </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Startdatum: {cycle?.start_date ?? "Noch nicht gesetzt"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Wechselstunden: {cycle?.switch_hours ?? 12}
                </p>
              </div>
              <form action={updateScheduleCycle} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Startdatum</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={cycle?.start_date ?? new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="switchHours">Wechselstunden</Label>
                  <Input
                    id="switchHours"
                    name="switchHours"
                    type="number"
                    defaultValue={cycle?.switch_hours ?? 12}
                    min={1}
                  />
                </div>
                <RotationOrderBuilder
                  divisions={divisions ?? []}
                  initialOrder={cycle?.order_division_ids ?? []}
                  hiddenInputName="divisionOrder"
                />
                <Button type="submit" className="w-full">
                  Zyklus speichern
                </Button>
              </form>
            </div>
          </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bestehende Wachabteilungen</CardTitle>
          <CardDescription>
            Übersicht aller Divisionen Ihrer Wache
          </CardDescription>
        </CardHeader>
        <CardContent>
          {divisions && divisions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Farbe</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divisions.map((division: any) => (
                  <TableRow key={division.id}>
                    <TableCell>
                      <p className="font-medium">{division.name}</p>
                    </TableCell>
                    <TableCell>
                      {division.color ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: division.color }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {division.color}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Keine Farbe
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(division.created_at).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DivisionActionsMenu division={division} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">
              Keine Wachabteilungen vorhanden. Legen Sie die erste Wachabteilung an.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
