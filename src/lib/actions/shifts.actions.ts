'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createShift(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('User not authenticated');
        throw new Error("User not authenticated.");
    }

    // Extract form data
    const date = formData.get('date') as string;
    const start_time = formData.get('start_time') as string;
    const end_time = formData.get('end_time') as string;
    const division_id = formData.get('division_id') as string;
    const wachleitung_im_haus = formData.get('wachleitung_im_haus') === 'on';

    console.log('Form data:', { date, start_time, end_time, division_id, wachleitung_im_haus });

    // Get assignments, copied trupps, and praktikant flags from hidden inputs
    const assignmentsJson = formData.get('assignments') as string;
    const copiedTruppsJson = formData.get('copiedTrupps') as string;
    const praktikantFlagsJson = formData.get('praktikantFlags') as string;

    if (!date || !start_time || !end_time || !division_id) {
        console.error('Missing required fields:', { date, start_time, end_time, division_id });
        return redirect('/admin/shifts/new?error=Alle erforderlichen Felder müssen ausgefüllt werden.');
    }

    let assignments: any = {};
    let copiedTrupps: any = {};
    let praktikantFlags: any = {};

    try {
        assignments = assignmentsJson ? JSON.parse(assignmentsJson) : {};
        copiedTrupps = copiedTruppsJson ? JSON.parse(copiedTruppsJson) : {};
        praktikantFlags = praktikantFlagsJson ? JSON.parse(praktikantFlagsJson) : {};
    } catch (error) {
        console.error('Error parsing JSON data:', error);
        return redirect('/admin/shifts/new?error=Fehler beim Verarbeiten der Zuweisungen.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/admin/shifts/new?error=Keine Berechtigung.');
    }

    // Verify division belongs to user's station
    const { data: division } = await supabase
        .from('divisions')
        .select('id, station_id')
        .eq('id', division_id)
        .single();

    if (!division || division.station_id !== membership.station_id) {
        return redirect('/admin/shifts/new?error=Ungültige Wachabteilung.');
    }

    // Create datetime strings (combine date with times)
    // Normalize time format - remove seconds if present, then add them
    const normalizeTime = (time: string) => {
        // Split by : and take only first 2 parts (HH:MM)
        const parts = time.split(':');
        return `${parts[0]}:${parts[1]}`;
    };

    const starts_at = `${date}T${normalizeTime(start_time)}:00`;
    const ends_at = `${date}T${normalizeTime(end_time)}:00`;

    console.log('Raw times:', { start_time, end_time });
    console.log('Timestamps:', { starts_at, ends_at });

    // Create shift
    // Determine label based on time - temporary workaround until migration is run
    const hour = parseInt(start_time.split(':')[0]);
    const tempLabel = (hour >= 7 && hour < 19) ? 'DAY' : 'NIGHT';

    const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
            station_id: membership.station_id,
            division_id,
            starts_at,
            ends_at,
            label: tempLabel, // Use DAY or NIGHT until migration is run
            status: 'PUBLISHED'
        })
        .select()
        .single();

    if (shiftError) {
        console.error('Error creating shift:', shiftError);
        console.error('Error details:', JSON.stringify(shiftError, null, 2));

        // Check for duplicate key error
        if (shiftError.code === '23505') {
            return redirect(`/admin/shifts/new?error=${encodeURIComponent('Es existiert bereits eine Schicht für diese Wachabteilung zu dieser Startzeit.')}`);
        }

        return redirect(`/admin/shifts/new?error=${encodeURIComponent('Fehler beim Erstellen der Schicht: ' + shiftError.message)}`);
    }

    console.log('Shift created successfully:', shift);

    // Create assignments
    const assignmentRecords = [];

    for (const [vehicleId, slots] of Object.entries(assignments)) {
        const vehicleAssignments = slots as Record<string, string | null>;

        for (const [slotKey, personId] of Object.entries(vehicleAssignments)) {
            if (personId) {
                // Get vehicle key from vehicle_configs
                const { data: vehicle } = await supabase
                    .from('vehicle_configs')
                    .select('key')
                    .eq('id', vehicleId)
                    .single();

                if (vehicle) {
                    assignmentRecords.push({
                        shift_id: shift.id,
                        vehicle_key: vehicle.key,
                        slot_key: slotKey,
                        person_id: personId,
                        updated_by: user.id
                    });
                }
            }
        }
    }

    if (assignmentRecords.length > 0) {
        const { error: assignmentsError } = await supabase
            .from('assignments')
            .insert(assignmentRecords);

        if (assignmentsError) {
            console.error('Error creating assignments:', assignmentsError);
            // Don't fail the whole operation, just log the error
        }
    }

    revalidatePath('/admin/shifts');
    redirect('/admin/shifts?success=Schicht erfolgreich erstellt.');
}
