'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createDivision(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const name = formData.get('name') as string;
    const color = formData.get('color') as string;

    if (!name || name.trim() === '') {
        return redirect('/app/divisions?error=Name ist erforderlich.');
    }

    // Get user's station
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single<{ station_id: string; role: string }>();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/app/divisions?error=Keine Berechtigung.');
    }

    // Create division
    const { error } = await supabase
        .from('divisions')
        .insert({
            station_id: membership.station_id,
            name: name.trim(),
            color: color || null
        } as any);

    if (error) {
        console.error('Error creating division:', error);
        return redirect(`/app/divisions?error=${encodeURIComponent('Fehler beim Erstellen der Division.')}`);
    }

    revalidatePath('/app/divisions');
    redirect('/app/divisions?success=Division erfolgreich erstellt.');
}

export async function deleteDivision(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const divisionId = formData.get('divisionId') as string;

    if (!divisionId) {
        return redirect('/app/divisions?error=Division nicht gefunden.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single<{ station_id: string; role: string }>();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/app/divisions?error=Keine Berechtigung.');
    }

    // Verify division belongs to user's station
    const { data: division } = await supabase
        .from('divisions')
        .select('station_id')
        .eq('id', divisionId)
        .single<{ station_id: string }>();

    if (!division || division.station_id !== membership.station_id) {
        return redirect('/app/divisions?error=Division nicht gefunden.');
    }

    // Delete division
    const { error } = await supabase
        .from('divisions')
        .delete()
        .eq('id', divisionId);

    if (error) {
        console.error('Error deleting division:', error);
        return redirect(`/app/divisions?error=${encodeURIComponent('Fehler beim Löschen der Division. Möglicherweise wird sie noch verwendet.')}`);
    }

    revalidatePath('/app/divisions');
    redirect('/app/divisions?success=Division erfolgreich gelöscht.');
}
