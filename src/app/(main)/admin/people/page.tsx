import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PeoplePoolsManager } from "@/components/admin/people-pools-manager";

type PeoplePageProps = {
  searchParams: { error?: string; success?: string };
};

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
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

  const { data: people } = await supabase
    .from("people")
    .select("*")
    .eq("station_id", membership.station_id)
    .order("name", { ascending: true });

  return (
    <div className="py-8 px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Personal</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Mitarbeiter, Notärzte und Führungsdienst getrennt
        </p>
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

      <PeoplePoolsManager people={people || []} />
    </div>
  );
}
