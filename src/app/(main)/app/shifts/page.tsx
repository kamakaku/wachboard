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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShiftActions } from "@/components/admin/shift-actions";

export default async function ShiftsPage({
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
    .single<{ station_id: string; role: string; division_ids: string[] | null }>();

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

  // Get ALL existing shifts for the station (no division filter for EDITOR)
  const { data: shifts, error: shiftsError } = await supabase
    .from("shifts")
    .select(
      `
        *,
        division:divisions(id, name, color),
        assignments:assignments(id, vehicle_key)
      `
    )
    .eq("station_id", membership.station_id)
    .order("starts_at", { ascending: true });

  if (shiftsError) {
    console.error("Error fetching shifts:", shiftsError);
  }

  // Determine which shifts the user can edit
  const userDivisions = membership.division_ids || [];
  const canEditShift = (divisionId: string) => {
    if (membership.role === "ADMIN") return true;
    return userDivisions.includes(divisionId);
  };

  // Split shifts into current (today and future) and past
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const currentShifts = shifts?.filter((shift: any) => {
    const shiftDate = new Date(shift.starts_at);
    return shiftDate >= today;
  }) || [];

  const pastShifts = shifts?.filter((shift: any) => {
    const shiftDate = new Date(shift.starts_at);
    return shiftDate < today;
  }) || [];

  // Sort: current shifts ascending (upcoming first), past shifts descending (most recent first)
  currentShifts.sort((a: any, b: any) =>
    new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  pastShifts.sort((a: any, b: any) =>
    new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
  );

  const formatDateTime = (dateStr: string) => {
    const [datePart, timePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-');
    const [hours, minutes] = timePart.split(':');
    return `${day}.${month}.${year.slice(2)}, ${hours}:${minutes}`;
  };

  const formatTime = (dateStr: string) => {
    const timePart = dateStr.split('T')[1];
    const [hours, minutes] = timePart.split(':');
    return `${hours}:${minutes}`;
  };

  const renderShiftRow = (shift: any) => {
    const hasEditAccess = canEditShift(shift.division_id);

    return (
      <TableRow key={shift.id}>
        <TableCell>
          {formatDateTime(shift.starts_at)}
          {" - "}
          {formatTime(shift.ends_at)}
        </TableCell>
        <TableCell>{shift.division?.name}</TableCell>
        <TableCell>
          <Badge variant="secondary">{shift.assignments?.length || 0}</Badge>
        </TableCell>
        <TableCell>
          <Badge>{shift.status}</Badge>
        </TableCell>
        <TableCell>
          <ShiftActions
            shiftId={shift.id}
            hasEditAccess={hasEditAccess}
            shift={shift}
          />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="py-8 px-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dienstplan</h1>
          <p className="text-muted-foreground">
            Übersicht und Verwaltung aller Dienstpläne
          </p>
        </div>
        <Link href="/app/shifts/new">
          <Button>Neue Schicht erstellen</Button>
        </Link>
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

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="current">
            Aktuell ({currentShifts.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Vergangen ({pastShifts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Aktuelle & Kommende Schichten</CardTitle>
              <CardDescription>
                Dienstpläne von heute und zukünftig
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentShifts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum & Zeit</TableHead>
                      <TableHead>Wachabteilung</TableHead>
                      <TableHead>Besetzung</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentShifts.map(renderShiftRow)}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine aktuellen Schichten vorhanden. Erstellen Sie die erste Schicht.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past">
          <Card>
            <CardHeader>
              <CardTitle>Vergangene Schichten</CardTitle>
              <CardDescription>
                Archiv aller abgeschlossenen Dienstpläne
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pastShifts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum & Zeit</TableHead>
                      <TableHead>Wachabteilung</TableHead>
                      <TableHead>Besetzung</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastShifts.map(renderShiftRow)}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine vergangenen Schichten vorhanden.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
