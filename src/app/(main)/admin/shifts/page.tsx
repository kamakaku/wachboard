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

export default async function ShiftsPage() {
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

  // TODO: Get shifts from database
  const shifts: any[] = [];

  return (
    <div className="py-8 px-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dienstplan</h1>
          <p className="text-muted-foreground">
            Erstellen Sie Dienstpläne für Ihre Schichten
          </p>
        </div>
        <Link href="/admin/shifts/new">
          <Button>Neue Schicht erstellen</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Geplante Schichten</CardTitle>
          <CardDescription>
            Übersicht aller erstellten Dienstpläne
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shifts && shifts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Wachabteilung</TableHead>
                  <TableHead>Fahrzeuge</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift: any) => (
                  <TableRow key={shift.id}>
                    <TableCell>{shift.date}</TableCell>
                    <TableCell>{shift.division?.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{shift.vehicles?.length || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{shift.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Bearbeiten
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Noch keine Schichten geplant. Erstellen Sie die erste Schicht.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
