import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AdminLayoutWrapper } from "@/components/admin/admin-layout-wrapper";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get user's membership with role and division info
  const { data: membership } = await supabase
    .from('memberships')
    .select('station_id, role, division_ids')
    .eq('user_id', user.id)
    .limit(1)
    .single<{ station_id: string; role: string; division_ids: string[] | null }>();

  if (!membership) {
    return (
        <div className="py-8 px-6">
            <Card>
                <CardHeader>
                    <CardTitle>Keine Wache zugewiesen</CardTitle>
                    <CardDescription>
                       Sie sind keiner Wache zugewiesen. Bitte kontaktieren Sie einen Administrator.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }

  return (
    <AdminLayoutWrapper userRole={membership.role} divisionIds={membership.division_ids || []}>
      {children}
    </AdminLayoutWrapper>
  );
}
