import { acceptJoinRequest, rejectJoinRequest } from "@/lib/actions/station.actions";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Monitor } from "lucide-react";

export default async function AdminPage({
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

  if (!membership) {
    redirect("/onboarding");
  }

  const isAdmin = membership.role === "ADMIN";

  // Get pending join requests for this station (only for admins)
  const { data: joinRequests } = isAdmin
    ? await supabase
        .from("join_requests")
        .select("id, created_at, user:users_profile(id, email, name)")
        .eq("station_id", membership.station_id)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
    : { data: [] };

  // Get all divisions for the station
  const { data: divisions } = await supabase
    .from("divisions")
    .select("id, name")
    .eq("station_id", membership.station_id)
    .order("name", { ascending: true });

  return (
    <div className="py-8 px-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Dashboard
            {membership.role === 'ADMIN' && <span className="text-sm font-normal text-muted-foreground ml-2">(Administrator)</span>}
            {membership.role === 'EDITOR' && <span className="text-sm font-normal text-muted-foreground ml-2">(Editor)</span>}
            {membership.role === 'VIEWER' && <span className="text-sm font-normal text-muted-foreground ml-2">(Ansicht)</span>}
          </h1>
          <p className="text-muted-foreground">
            {membership.role === 'ADMIN' && 'Verwalten Sie Ihre Wache und delegieren Sie Rollen.'}
            {membership.role === 'EDITOR' && 'Verwalten Sie Dienstpläne und Personal.'}
            {membership.role === 'VIEWER' && 'Ansicht der Wache und Dienstpläne.'}
          </p>
        </div>
        <Link href={`/display/${membership.station_id}`}>
          <Button>
            <Monitor className="h-4 w-4 mr-2" />
            Display-Ansicht
          </Button>
        </Link>
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

      {joinRequests && joinRequests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Beitrittsanfragen</CardTitle>
            <CardDescription>Neue Benutzer möchten Ihrer Wache beitreten.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {joinRequests.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {request.user?.name || "Unbekannt"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.user?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <form action={acceptJoinRequest}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="role" value="VIEWER" />
                          <Button type="submit" size="sm" variant="outline">
                            Akzeptieren
                          </Button>
                        </form>
                        <form action={rejectJoinRequest}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <Button type="submit" size="sm" variant="outline" className="text-destructive">
                            Ablehnen
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Statistik</CardTitle>
            <CardDescription>
              Übersicht über Ihre Wache
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Statistiken werden hier angezeigt
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
