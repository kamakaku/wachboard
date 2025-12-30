'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createShiftTemplate(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const label = (formData.get('label') as string)?.trim();
    const start_time = formData.get('start_time') as string;
    const end_time = formData.get('end_time') as string;

    if (!label || !start_time || !end_time) {
        return redirect('/app/settings?error=Alle Felder sind erforderlich.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/app/settings?error=Keine Berechtigung.');
    }

    // Insert new shift template
    const { error } = await supabase
        .from('shift_templates')
        .insert({
            station_id: membership.station_id,
            label,
            start_time,
            end_time
        });

    if (error) {
        console.error('Error creating shift template:', error);
        if (error.code === '23505') { // Unique violation
            return redirect(`/app/settings?error=${encodeURIComponent('Eine Schicht mit diesem Namen existiert bereits.')}`);
        }
        return redirect(`/app/settings?error=${encodeURIComponent('Fehler beim Erstellen der Schicht.')}`);
    }

    revalidatePath('/app/settings');
    redirect('/app/settings?success=Schicht erfolgreich erstellt.');
}

export async function updateShiftTemplate(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const id = formData.get('id') as string;
    const label = (formData.get('label') as string)?.trim();
    const start_time = formData.get('start_time') as string;
    const end_time = formData.get('end_time') as string;

    if (!id || !label || !start_time || !end_time) {
        return redirect('/app/settings?error=Alle Felder sind erforderlich.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/app/settings?error=Keine Berechtigung.');
    }

    // Update shift template
    const { error } = await supabase
        .from('shift_templates')
        .update({
            label,
            start_time,
            end_time
        })
        .eq('id', id)
        .eq('station_id', membership.station_id);

    if (error) {
        console.error('Error updating shift template:', error);
        if (error.code === '23505') { // Unique violation
            return redirect(`/app/settings?error=${encodeURIComponent('Eine Schicht mit diesem Namen existiert bereits.')}`);
        }
        return redirect(`/app/settings?error=${encodeURIComponent('Fehler beim Aktualisieren der Schicht.')}`);
    }

    revalidatePath('/app/settings');
    redirect('/app/settings?success=Schicht erfolgreich aktualisiert.');
}

export async function deleteShiftTemplate(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const id = formData.get('id') as string;

    if (!id) {
        return redirect('/app/settings?error=Schicht-ID fehlt.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/app/settings?error=Keine Berechtigung.');
    }

    // Delete shift template
    const { error } = await supabase
        .from('shift_templates')
        .delete()
        .eq('id', id)
        .eq('station_id', membership.station_id);

    if (error) {
        console.error('Error deleting shift template:', error);
        return redirect(`/app/settings?error=${encodeURIComponent('Fehler beim Löschen der Schicht.')}`);
    }

    revalidatePath('/app/settings');
    redirect('/app/settings?success=Schicht erfolgreich gelöscht.');
}

export async function updateScheduleCycle(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const start_date = formData.get('start_date') as string;
    const switch_hours = parseInt(formData.get('switch_hours') as string);
    const division_ids = formData.getAll('division_ids') as string[];

    if (!start_date || !switch_hours || division_ids.length === 0) {
        return redirect('/app/settings?error=Alle Felder sind erforderlich.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/app/settings?error=Keine Berechtigung.');
    }

    // Verify all division IDs belong to this station
    const { data: divisions, error: divError } = await supabase
        .from('divisions')
        .select('id')
        .eq('station_id', membership.station_id)
        .in('id', division_ids);

    if (divError || !divisions || divisions.length !== division_ids.length) {
        return redirect('/app/settings?error=Ungültige Divisionen ausgewählt.');
    }

    // Check if cycle exists
    const { data: existingCycle } = await supabase
        .from('schedule_cycles')
        .select('id')
        .eq('station_id', membership.station_id)
        .single();

    let error;

    if (existingCycle) {
        // Update existing cycle
        const result = await supabase
            .from('schedule_cycles')
            .update({
                start_date,
                switch_hours,
                order_division_ids: division_ids
            })
            .eq('station_id', membership.station_id);

        error = result.error;
    } else {
        // Create new cycle
        const result = await supabase
            .from('schedule_cycles')
            .insert({
                station_id: membership.station_id,
                start_date,
                switch_hours,
                order_division_ids: division_ids
            });

        error = result.error;
    }

    if (error) {
        console.error('Error updating schedule cycle:', error);
        return redirect(`/app/settings?error=${encodeURIComponent('Fehler beim Speichern des Zyklus.')}`);
    }

    revalidatePath('/app/settings');
    redirect('/app/settings?success=Schicht-Zyklus erfolgreich gespeichert.');
}
