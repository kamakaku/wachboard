import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AdminLayoutWrapper } from "@/components/admin/admin-layout-wrapper";

async function checkAdminRole(stationId: string) {
    const supabase = createClient();
    const { data: membership } = await supabase
        .from('memberships')
        .select('role')
        .eq('station_id', stationId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();

    return membership?.role === 'ADMIN';
}


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

  // In a multi-station setup, we'd get the station from URL params
  // For now, we get the user's first assigned station
  const { data: membership } = await supabase
    .from('memberships')
    .select('station_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!membership || !(await checkAdminRole(membership.station_id))) {
    return (
        <div className="py-8 px-6">
            <Card>
                <CardHeader>
                    <CardTitle>Zugriff verweigert</CardTitle>
                    <CardDescription>
                       Sie müssen ein Administrator sein, um auf diese Seite zugreifen zu können.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }

  return (
    <AdminLayoutWrapper>
      {children}
    </AdminLayoutWrapper>
  );
}
