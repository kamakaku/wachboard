import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type DashboardShift = {
  id: string;
  starts_at: string;
  ends_at: string;
  label: string;
  division: { name: string } | null;
};

export default async function AppDashboard() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { return redirect("/login"); }

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select(`role, station:stations (id, name)`)
    .eq("user_id", user.id);

  if (error) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">
          <AlertTitle>Datenbankfehler</AlertTitle>
          <Typography component="span" variant="body2" fontFamily="Menlo, monospace">
            {error.message}
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (!memberships || memberships.length === 0) {
    // User has no membership, redirect to onboarding
    redirect('/onboarding');
  }

  // User has a membership, proceed as normal
  const membership = memberships[0];

  const now = new Date();
  const { data: shifts } = await supabase
    .from('shifts')
    .select('id, starts_at, ends_at, label, division:divisions(name)')
    .eq('station_id', membership.station!.id)
    .gt('ends_at', now.toISOString())
    .order('starts_at', { ascending: true })
    .limit(5);

  const formatShiftTime = (startsAt: string, endsAt: string) => {
    const starts = new Date(startsAt);
    const ends = new Date(endsAt);
    return `${starts.toLocaleString("de-DE")} – ${ends.toLocaleString("de-DE")}`;
  };

  return (
    <Stack spacing={4}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Dashboard
          </Typography>
          <Typography color="text.secondary">
            Willkommen, {user.email}. Wache: {membership.station!.name}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Link href={`/display/${membership.station!.id}`} legacyBehavior>
            <Button variant="outlined" component="span">
              Display-Ansicht
            </Button>
          </Link>
          {membership.role === "ADMIN" && (
            <Link href="/admin" legacyBehavior>
              <Button variant="contained" component="span">
                Admin
              </Button>
            </Link>
          )}
        </Stack>
      </Stack>

      <Card variant="outlined">
        <CardHeader
          title="Anstehende Dienste"
          subheader="Dies sind die nächsten geplanten Dienste für Ihre Wache."
        />
        <Divider />
        <CardContent>
          {shifts && shifts.length > 0 ? (
            <Stack spacing={2}>
              {shifts.map((shift: DashboardShift) => (
                <Card
                  key={shift.id}
                  variant="outlined"
                  sx={{ backgroundColor: "background.default" }}
                >
                  <CardContent>
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item xs>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {shift.division?.name || "Unbekannte Division"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatShiftTime(shift.starts_at, shift.ends_at)} ({shift.label})
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Link href={`/app/editor/${shift.id}`} legacyBehavior>
                          <Button variant="contained" component="span">
                            Bearbeiten
                          </Button>
                        </Link>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary">
              Keine anstehenden Dienste gefunden. Ein Admin muss möglicherweise neue Dienste generieren.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
