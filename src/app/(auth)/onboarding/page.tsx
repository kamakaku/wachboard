import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/constants";
import {
  createStationAndBecomeAdmin,
  requestToJoinStation,
} from "@/lib/actions/station.actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function OnboardingPage({
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

  // Check if user already has a membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (membership) {
    // User already has a membership, redirect to app
    redirect("/app");
  }

  // Check if user has pending join requests
  const { data: pendingRequests } = await supabase
    .from("join_requests")
    .select("id, station:stations(name), created_at")
    .eq("user_id", user.id)
    .eq("status", "PENDING");

  // Get all available stations
  const { data: stations } = await supabase
    .from("stations")
    .select("id, name, org:organizations(name)")
    .order("name", { ascending: true });

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Willkommen bei {APP_NAME}</h1>
        <p className="text-muted-foreground">
          Wählen Sie eine bestehende Wache aus oder erstellen Sie eine neue.
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

      {pendingRequests && pendingRequests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ausstehende Anfragen</CardTitle>
            <CardDescription>
              Sie haben bereits Beitrittsanfragen gesendet. Bitte warten Sie auf
              die Bestätigung eines Administrators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingRequests.map((request: any) => (
                <div
                  key={request.id}
                  className="flex justify-between items-center p-3 border rounded-md"
                >
                  <div>
                    <p className="font-medium">{request.station?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Gesendet am{" "}
                      {new Date(request.created_at).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <span className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                    Ausstehend
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="join" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="join">Wache beitreten</TabsTrigger>
          <TabsTrigger value="create">Neue Wache erstellen</TabsTrigger>
        </TabsList>

        <TabsContent value="join">
          <Card>
            <CardHeader>
              <CardTitle>Einer Wache beitreten</CardTitle>
              <CardDescription>
                Wählen Sie eine bestehende Wache aus und senden Sie eine
                Beitrittsanfrage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stations && stations.length > 0 ? (
                <div className="space-y-3">
                  {stations.map((station: any) => (
                    <form
                      key={station.id}
                      action={requestToJoinStation}
                      className="flex justify-between items-center p-4 border rounded-md hover:bg-accent transition-colors"
                    >
                      <input type="hidden" name="stationId" value={station.id} />
                      <div>
                        <p className="font-medium">{station.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {station.org?.name || "Keine Organisation"}
                        </p>
                      </div>
                      <Button type="submit" variant="outline">
                        Beitreten
                      </Button>
                    </form>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Keine Wachen verfügbar. Erstellen Sie eine neue Wache.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Neue Wache erstellen</CardTitle>
              <CardDescription>
                Erstellen Sie eine neue Wache. Sie werden automatisch als
                Administrator hinzugefügt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createStationAndBecomeAdmin} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="stationName">Name der Wache *</Label>
                  <Input
                    id="stationName"
                    name="stationName"
                    placeholder="z.B. Wache 1, Feuerwache Nord"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="organizationName">
                    Organisation (optional)
                  </Label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    placeholder="z.B. Feuerwehr München"
                  />
                  <p className="text-sm text-muted-foreground">
                    Wenn leer, wird die Standard-Organisation verwendet oder eine
                    neue erstellt.
                  </p>
                </div>
                <Button type="submit" className="w-full">
                  Wache erstellen und Administrator werden
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
