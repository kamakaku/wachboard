'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateScheduleCycle(formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const startDate = (formData.get("startDate") as string | null) ?? null;
  const switchHoursInput = formData.get("switchHours") as string | null;
  const divisionOrderRaw = formData.get("divisionOrder") as string | null;

  const switchHours = switchHoursInput ? Number(switchHoursInput) : 12;
  let divisionOrder: string[] = [];
  try {
    divisionOrder = divisionOrderRaw ? JSON.parse(divisionOrderRaw) : [];
  } catch (error) {
    console.warn("Invalid division order payload", error);
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("station_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "ADMIN") {
    return redirect("/app/divisions?error=Keine Berechtigung.");
  }

  const cleanOrder = divisionOrder.filter((id) => typeof id === "string");
  const payload = {
    station_id: membership.station_id,
    start_date: startDate ? startDate : new Date().toISOString().slice(0, 10),
    order_division_ids: cleanOrder.length > 0 ? cleanOrder : undefined,
    switch_hours: Number.isFinite(switchHours) ? switchHours : 12,
  };

  const { error } = await supabase.from("schedule_cycles").upsert(payload, {
    onConflict: "station_id",
  });

  if (error) {
    console.error("Error updating schedule cycle:", error);
    return redirect(`/app/divisions?error=${encodeURIComponent("Fehler beim Speichern des Zyklus.")}`);
  }

  revalidatePath("/app/divisions");
  redirect("/app/divisions?success=Zyklus erfolgreich gespeichert.");
}
