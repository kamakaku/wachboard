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
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  createVehicle,
  deleteVehicle,
  updateVehicle,
  updateVehicleOrder,
} from "@/lib/actions/vehicle.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VehicleConfigBuilder } from "@/components/admin/vehicle-config-builder";
import { VehicleActionsMenu } from "@/components/admin/vehicle-actions-menu";

export default async function VehiclesPage({
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

  // Get all vehicles for this station
  const { data: vehicles } = await supabase
    .from("vehicle_configs")
    .select("*")
    .eq("station_id", membership.station_id)
    .order("order", { ascending: true });

  return (
    <div className="py-8 px-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Fahrzeuge</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Fahrzeugkonfigurationen
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Neues Fahrzeug erstellen</Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neues Fahrzeug erstellen</DialogTitle>
              <DialogDescription>
                Erstellen Sie eine neue Fahrzeugkonfiguration mit Positionen
              </DialogDescription>
            </DialogHeader>
            <form action={createVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="key">
                    Schlüssel * (eindeutig, z.B. RTW X(22/6))
                  </Label>
                  <Input
                    id="key"
                    name="key"
                    placeholder="z.B. RTW X(22/6)"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="z.B. LHF 20"
                    required
                  />
                </div>
              </div>

              <VehicleConfigBuilder fieldName="config" />

              <div className="grid gap-2">
                <Label htmlFor="image_url">Bild-URL (optional)</Label>
                <Input
                  id="image_url"
                  name="image_url"
                  placeholder="https://... oder wähle Datei"
                  type="url"
                />
                <Button variant="outline" type="button" asChild>
                  <label>
                    Bild hochladen
                    <input type="file" name="image_file" accept="image/*" className="hidden" />
                  </label>
                </Button>
              </div>

              <DialogFooter>
                <Button type="submit">Fahrzeug erstellen</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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

      <Card>
        <CardHeader>
          <CardTitle>Fahrzeug-Übersicht</CardTitle>
          <CardDescription>
            Alle konfigurierten Fahrzeuge ({vehicles?.length || 0})
          </CardDescription>
        </CardHeader>
        <CardContent>
            {vehicles && vehicles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reihenfolge</TableHead>
                    <TableHead>Bild</TableHead>
                    <TableHead>Schlüssel</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Positionen</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle: any, idx: number) => {
                    const config = vehicle.config;
                    const slotCount = config.slots
                      ? config.slots.length
                      : config.trupps
                      ? config.trupps.reduce(
                          (acc: number, t: any) => acc + (t.slots?.length || 0),
                          0
                        )
                      : 0;

                    return (
                      <TableRow key={vehicle.id}>
                        <TableCell>
                          <div className="flex gap-1">
                            {idx > 0 && (
                              <form action={updateVehicleOrder}>
                                <input
                                  type="hidden"
                                  name="vehicleId"
                                  value={vehicle.id}
                                />
                                <input
                                  type="hidden"
                                  name="direction"
                                  value="up"
                                />
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                >
                                  ↑
                                </Button>
                              </form>
                            )}
                            {idx < vehicles.length - 1 && (
                              <form action={updateVehicleOrder}>
                                <input
                                  type="hidden"
                                  name="vehicleId"
                                  value={vehicle.id}
                                />
                                <input
                                  type="hidden"
                                  name="direction"
                                  value="down"
                                />
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                >
                                  ↓
                                </Button>
                              </form>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {vehicle.image_url ? (
                            <img
                              src={vehicle.image_url}
                              alt={vehicle.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                              Kein Bild
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {vehicle.key}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">
                          {vehicle.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{slotCount} Positionen</Badge>
                        </TableCell>
                      <TableCell>
                        <VehicleActionsMenu vehicle={vehicle} />
                      </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">
                Keine Fahrzeuge konfiguriert. Erstellen Sie das erste Fahrzeug.
              </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
