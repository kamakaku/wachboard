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
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JoinRequestApprovalForm } from "@/components/admin/join-request-approval-form";
import { rejectJoinRequest } from "@/lib/actions/station.actions";

export default async function JoinRequestsPage({
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

  // Get all pending join requests for this station
  const { data: joinRequests } = await supabase
    .from("join_requests")
    .select("*, user:users_profile(id, email, name)")
    .eq("station_id", membership.station_id)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  // Get all divisions for role assignment
  const { data: divisions } = await supabase
    .from("divisions")
    .select("id, name")
    .eq("station_id", membership.station_id)
    .order("name", { ascending: true });

  return (
    <div className="py-8 px-6">
      <h1 className="text-3xl font-bold mb-6">Beitrittsanfragen</h1>

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
          <CardTitle>Ausstehende Anfragen</CardTitle>
          <CardDescription>
            Benutzer, die Ihrer Wache beitreten möchten ({joinRequests?.length || 0}{" "}
            ausstehend)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {joinRequests && joinRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Angefragt am</TableHead>
                  <TableHead>Aktionen</TableHead>
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
                    <TableCell>
                      <div className="flex gap-2">
                        <JoinRequestApprovalForm
                          requestId={request.id}
                          divisions={divisions || []}
                        />
                        <form action={rejectJoinRequest}>
                          <input
                            type="hidden"
                            name="requestId"
                            value={request.id}
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                          >
                            Ablehnen
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Keine ausstehenden Beitrittsanfragen.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
