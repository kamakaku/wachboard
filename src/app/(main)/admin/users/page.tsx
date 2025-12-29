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
import { updateUserRole, removeMembership } from "@/lib/actions/user.actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function UsersPage({
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

  // Get all users with memberships for this station
  const { data: memberships } = await supabase
    .from("memberships")
    .select("*, user:users_profile(id, email, name)")
    .eq("station_id", membership.station_id)
    .order("created_at", { ascending: false });

  // Get all divisions for role assignment
  const { data: divisions } = await supabase
    .from("divisions")
    .select("id, name")
    .eq("station_id", membership.station_id)
    .order("name", { ascending: true });

  return (
    <div className="py-8 px-6">
      <h1 className="text-3xl font-bold mb-6">Benutzerverwaltung</h1>

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
          <CardTitle>Stationsmitglieder</CardTitle>
          <CardDescription>
            Verwalten Sie Benutzer und deren Rollen ({memberships?.length || 0}{" "}
            Mitglieder)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memberships && memberships.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Beigetreten</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {m.user?.name || "Unbekannt"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {m.user?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.role === "ADMIN"
                            ? "default"
                            : m.role === "EDITOR"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {m.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.division_id ? (
                        divisions?.find((d) => d.id === m.division_id)?.name ||
                        "Unbekannt"
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(m.created_at).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell>
                      {m.user_id !== user.id && (
                        <div className="flex gap-2">
                          <form action={updateUserRole}>
                            <input
                              type="hidden"
                              name="membershipId"
                              value={m.id}
                            />
                            <select
                              name="newRole"
                              className="text-sm border rounded px-2 py-1 mr-2"
                              defaultValue={m.role}
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="EDITOR">Editor</option>
                              <option value="VIEWER">Viewer</option>
                            </select>
                            <Button type="submit" variant="outline" size="sm">
                              Rolle ändern
                            </Button>
                          </form>
                          <form action={removeMembership}>
                            <input
                              type="hidden"
                              name="membershipId"
                              value={m.id}
                            />
                            <Button
                              type="submit"
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                            >
                              Entfernen
                            </Button>
                          </form>
                        </div>
                      )}
                      {m.user_id === user.id && (
                        <span className="text-sm text-muted-foreground">
                          Sie selbst
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Keine Mitglieder gefunden.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
