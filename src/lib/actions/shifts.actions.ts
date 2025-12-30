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
        return redirect('/app/shifts/new?error=Alle erforderlichen Felder müssen ausgefüllt werden.');
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
        return redirect('/app/shifts/new?error=Fehler beim Verarbeiten der Zuweisungen.');
    }

    // Get user's station and verify role
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role, division_ids')
        .eq('user_id', user.id)
        .single<{ station_id: string; role: string; division_ids: string[] | null }>();

    if (!membership || !['ADMIN', 'EDITOR'].includes(membership.role)) {
        return redirect('/app/shifts/new?error=Keine Berechtigung.');
    }

    // Verify division belongs to user's station
    const { data: division } = await supabase
        .from('divisions')
        .select('id, station_id')
        .eq('id', division_id)
        .single<{ id: string; station_id: string }>();

    if (!division || division.station_id !== membership.station_id) {
        return redirect('/app/shifts/new?error=Ungültige Wachabteilung.');
    }

    // For EDITOR, verify they have access to this division
    if (membership.role === 'EDITOR') {
        const userDivisions = membership.division_ids || [];
        if (!userDivisions.includes(division_id)) {
            return redirect('/app/shifts/new?error=Sie haben keinen Zugriff auf diese Division.');
        }
    }

    // Create datetime strings (combine date with times)
    // Normalize time format - remove seconds if present, then add them
    const normalizeTime = (time: string) => {
        // Split by : and take only first 2 parts (HH:MM)
        const parts = time.split(':');
        return `${parts[0]}:${parts[1]}`;
    };

    // Store times WITHOUT timezone (database will treat as local time)
    let starts_at = `${date}T${normalizeTime(start_time)}:00`;
    let ends_at = `${date}T${normalizeTime(end_time)}:00`;

    // If end time is before or equal to start time, assume it's the next day
    if (normalizeTime(end_time) <= normalizeTime(start_time)) {
        const endDate = new Date(`${date}T${normalizeTime(end_time)}:00`);
        endDate.setDate(endDate.getDate() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];
        ends_at = `${endDateStr}T${normalizeTime(end_time)}:00`;
    }

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
        } as any)
        .select()
        .single<{ id: string }>();

    if (shiftError) {
        console.error('Error creating shift:', shiftError);
        console.error('Error details:', JSON.stringify(shiftError, null, 2));

        // Check for duplicate key error
        if (shiftError.code === '23505') {
            return redirect(`/app/shifts/new?error=${encodeURIComponent('Es existiert bereits eine Schicht für diese Wachabteilung zu dieser Startzeit.')}`);
        }

        return redirect(`/app/shifts/new?error=${encodeURIComponent('Fehler beim Erstellen der Schicht: ' + shiftError.message)}`);
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
                    .single<{ key: string }>();

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
            .insert(assignmentRecords as any);

        if (assignmentsError) {
            console.error('Error creating assignments:', assignmentsError);
            // Don't fail the whole operation, just log the error
        }
    }

    revalidatePath('/app/shifts');
    redirect('/app/shifts?success=Schicht erfolgreich erstellt.');
}

export async function updateShift(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('User not authenticated');
        throw new Error("User not authenticated.");
    }

    const shiftId = formData.get('shiftId') as string;
    const date = formData.get('date') as string;
    const start_time = formData.get('start_time') as string;
    const end_time = formData.get('end_time') as string;
    const label = (formData.get('label') as string | null)?.trim() ?? null;
    const status = (formData.get('status') as string | null) ?? 'PUBLISHED';

    if (!shiftId || !date || !start_time || !end_time) {
        return redirect('/app/shifts?error=Alle erforderlichen Felder müssen ausgefüllt werden.');
    }

    const normalizeTime = (time: string) => {
        const parts = time.split(':');
        return `${parts[0]}:${parts[1] ?? '00'}`;
    };

    const starts_at = `${date}T${normalizeTime(start_time)}:00`;
    let ends_at = `${date}T${normalizeTime(end_time)}:00`;
    if (new Date(ends_at) <= new Date(starts_at)) {
        const endDate = new Date(ends_at);
        endDate.setDate(endDate.getDate() + 1);
        ends_at = endDate.toISOString().slice(0, 19);
    }

    const { error } = await (supabase
        .from('shifts')
        .update as any)({
            starts_at,
            ends_at,
            label,
            status,
        })
        .eq('id', shiftId);

    if (error) {
        console.error('Error updating shift:', error);
        return redirect(`/app/shifts?error=${encodeURIComponent('Fehler beim Aktualisieren der Schicht.')}`);
    }

    revalidatePath('/app/shifts');
    redirect('/app/shifts?success=Schicht erfolgreich aktualisiert.');
}

export async function updateShiftComplete(formData: FormData) {
    console.log('=====================================================');
    console.log('updateShiftComplete called!');
    console.log('FormData keys:', Array.from(formData.keys()));
    console.log('=====================================================');

    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('User not authenticated');
        throw new Error("User not authenticated.");
    }

    // Extract form data
    const shift_id = formData.get('shift_id') as string;
    const date = formData.get('date') as string;
    const start_time = formData.get('start_time') as string;
    const end_time = formData.get('end_time') as string;
    const division_id = formData.get('division_id') as string;
    const wachleitung_im_haus = formData.get('wachleitung_im_haus') === 'on';

    console.log('Basic form data:', { shift_id, date, start_time, end_time, division_id, wachleitung_im_haus });

    // Get assignments from hidden inputs
    const assignmentsJson = formData.get('assignments') as string;
    const copiedTruppsJson = formData.get('copiedTrupps') as string;
    const praktikantFlagsJson = formData.get('praktikantFlags') as string;
    const truppPraktikantFlagsJson = formData.get('truppPraktikantFlags') as string;

    if (!shift_id || !date || !start_time || !end_time || !division_id) {
        return redirect(`/app/shifts/${shift_id}/edit?error=Alle erforderlichen Felder müssen ausgefüllt werden.`);
    }

    let assignments: any = {};
    let copiedTrupps: any = {};
    let praktikantFlags: any = {};
    let truppPraktikantFlags: any = {};

    console.log('Raw JSON from form:', { assignmentsJson, copiedTruppsJson, praktikantFlagsJson, truppPraktikantFlagsJson });

    try {
        assignments = assignmentsJson ? JSON.parse(assignmentsJson) : {};
        copiedTrupps = copiedTruppsJson ? JSON.parse(copiedTruppsJson) : {};
        praktikantFlags = praktikantFlagsJson ? JSON.parse(praktikantFlagsJson) : {};
        truppPraktikantFlags = truppPraktikantFlagsJson ? JSON.parse(truppPraktikantFlagsJson) : {};
        console.log('Parsed assignments:', assignments);
        console.log('Parsed copiedTrupps:', copiedTrupps);
        console.log('Parsed praktikantFlags:', praktikantFlags);
        console.log('Parsed truppPraktikantFlags:', truppPraktikantFlags);
    } catch (error) {
        console.error('Error parsing JSON data:', error);
        return redirect(`/app/shifts/${shift_id}/edit?error=Fehler beim Verarbeiten der Zuweisungen.`);
    }

    // Get user's station and verify role
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role, division_ids')
        .eq('user_id', user.id)
        .single<{ station_id: string; role: string; division_ids: string[] | null }>();

    if (!membership || !['ADMIN', 'EDITOR'].includes(membership.role)) {
        return redirect(`/app/shifts/${shift_id}/edit?error=Keine Berechtigung.`);
    }

    // Verify shift belongs to user's station
    const { data: existingShift } = await supabase
        .from('shifts')
        .select('id, station_id, division_id')
        .eq('id', shift_id)
        .single<{ id: string; station_id: string; division_id: string }>();

    if (!existingShift || existingShift.station_id !== membership.station_id) {
        return redirect('/app/shifts?error=Schicht nicht gefunden.');
    }

    // For EDITOR, verify they have access to the existing shift's division
    if (membership.role === 'EDITOR') {
        const userDivisions = membership.division_ids || [];
        if (!userDivisions.includes(existingShift.division_id)) {
            return redirect(`/app/shifts/${shift_id}/edit?error=Sie haben keinen Zugriff auf diese Division.`);
        }
    }

    // Verify division belongs to user's station
    const { data: division } = await supabase
        .from('divisions')
        .select('id, station_id')
        .eq('id', division_id)
        .single<{ id: string; station_id: string }>();

    if (!division || division.station_id !== membership.station_id) {
        return redirect(`/app/shifts/${shift_id}/edit?error=Ungültige Wachabteilung.`);
    }

    // For EDITOR, verify they have access to the new division (if changing)
    if (membership.role === 'EDITOR' && division_id !== existingShift.division_id) {
        const userDivisions = membership.division_ids || [];
        if (!userDivisions.includes(division_id)) {
            return redirect(`/app/shifts/${shift_id}/edit?error=Sie haben keinen Zugriff auf die neue Division.`);
        }
    }

    // Normalize time format
    const normalizeTime = (time: string) => {
        const parts = time.split(':');
        return `${parts[0]}:${parts[1]}`;
    };

    // Store times WITHOUT timezone (database will treat as local time)
    let starts_at = `${date}T${normalizeTime(start_time)}:00`;
    let ends_at = `${date}T${normalizeTime(end_time)}:00`;

    // If end time is before or equal to start time, assume it's the next day
    if (normalizeTime(end_time) <= normalizeTime(start_time)) {
        const endDate = new Date(`${date}T${normalizeTime(end_time)}:00`);
        endDate.setDate(endDate.getDate() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];
        ends_at = `${endDateStr}T${normalizeTime(end_time)}:00`;
    }

    console.log('Updating shift:', { shift_id, starts_at, ends_at });

    // Determine label based on time
    const hour = parseInt(start_time.split(':')[0]);
    const tempLabel = (hour >= 7 && hour < 19) ? 'DAY' : 'NIGHT';

    // Update shift
    const { error: shiftError } = await (supabase
        .from('shifts')
        .update as any)({
            division_id,
            starts_at,
            ends_at,
            label: tempLabel,
            wachleitung_im_haus,
        })
        .eq('id', shift_id);

    if (shiftError) {
        console.error('Error updating shift:', shiftError);
        return redirect(`/app/shifts/${shift_id}/edit?error=${encodeURIComponent('Fehler beim Aktualisieren der Schicht: ' + shiftError.message)}`);
    }

    console.log('Shift updated successfully');

    // Delete existing assignments
    await supabase
        .from('assignments')
        .delete()
        .eq('shift_id', shift_id);

    // Create new assignments
    const assignmentRecords = [];

    console.log('Processing assignments. Total vehicles:', Object.keys(assignments).length);
    console.log('Processing copiedTrupps:', copiedTrupps);
    console.log('Processing praktikantFlags:', praktikantFlags);

    // Get vehicle ID to key mapping
    const { data: allVehicles } = await supabase
        .from('vehicle_configs')
        .select('id, key, config')
        .eq('station_id', membership.station_id) as any;

    const vehicleIdToKey = new Map();
    const vehicleKeyToId = new Map();
    allVehicles?.forEach((v: any) => {
        vehicleIdToKey.set(v.id, v.key);
        vehicleKeyToId.set(v.key, v.id);
    });

    // Build a set of slot keys that belong to copied trupps to avoid duplicates
    const copiedTruppSlots = new Set<string>();
    for (const [targetVehicleId, trupps] of Object.entries(copiedTrupps)) {
        const truppList = trupps as Array<{
            sourceVehicleId: string;
            sourceTruppKey: string;
            targetTruppKey: string;
        }>;

        for (const copiedTrupp of truppList) {
            // Mark all slots in the target vehicle that will be created by copied trupps
            const targetVehicleKey = vehicleIdToKey.get(targetVehicleId);
            if (targetVehicleKey) {
                // Get source trupp config to know which slots exist
                const sourceVehicle = allVehicles?.find((v: any) => v.id === copiedTrupp.sourceVehicleId);
                const sourceTrupp = sourceVehicle?.config?.trupps?.find((t: any) => t.key === copiedTrupp.sourceTruppKey);

                if (sourceTrupp?.slots) {
                    for (const slotName of sourceTrupp.slots) {
                        const targetSlotKey = `${copiedTrupp.targetTruppKey}:${slotName}`;
                        copiedTruppSlots.add(`${targetVehicleId}:${targetSlotKey}`);
                    }
                }
            }
        }
    }

    // Process regular assignments
    for (const [vehicleId, slots] of Object.entries(assignments)) {
        const vehicleAssignments = slots as Record<string, string | null>;
        const vehicleKey = vehicleIdToKey.get(vehicleId);

        if (!vehicleKey) {
            console.error(`Vehicle not found for ID: ${vehicleId}`);
            continue;
        }

        console.log(`Vehicle ${vehicleKey} has ${Object.keys(vehicleAssignments).length} slot assignments`);

        for (const [slotKey, personId] of Object.entries(vehicleAssignments)) {
            // Skip slots that belong to copied trupps (they'll be processed separately)
            const slotIdentifier = `${vehicleId}:${slotKey}`;
            if (copiedTruppSlots.has(slotIdentifier)) {
                console.log(`  - Skipping slot ${slotKey} (belongs to copied trupp)`);
                continue;
            }

            if (personId) {
                console.log(`  - Slot ${slotKey}: Person ${personId}`);
                assignmentRecords.push({
                    shift_id: shift_id,
                    vehicle_key: vehicleKey,
                    slot_key: slotKey,
                    person_id: personId,
                    updated_by: user.id
                });
            }
        }
    }

    // Process copied trupps
    // NOTE: Copied trupps store their assignments in the SOURCE vehicle's slots in the assignments object
    // The UI shows assignments from the source vehicle, and when you drag people to copied trupps,
    // they are stored in the source vehicle's slot keys
    for (const [targetVehicleId, trupps] of Object.entries(copiedTrupps)) {
        const truppList = trupps as Array<{
            sourceVehicleId: string;
            sourceTruppKey: string;
            targetTruppKey: string;
        }>;

        const targetVehicleKey = vehicleIdToKey.get(targetVehicleId);
        if (!targetVehicleKey) {
            console.error(`Target vehicle not found for ID: ${targetVehicleId}`);
            continue;
        }

        for (const copiedTrupp of truppList) {
            const sourceVehicleKey = vehicleIdToKey.get(copiedTrupp.sourceVehicleId);
            if (!sourceVehicleKey) {
                console.error(`Source vehicle not found for ID: ${copiedTrupp.sourceVehicleId}`);
                continue;
            }

            console.log(`Processing copied trupp: ${copiedTrupp.sourceTruppKey} from ${sourceVehicleKey} to ${targetVehicleKey} as ${copiedTrupp.targetTruppKey}`);

            // Get the source vehicle's assignments (this is where the UI stores them)
            const sourceAssignments = assignments[copiedTrupp.sourceVehicleId] || {};

            // Find all slot keys that belong to the source trupp
            for (const [slotKey, personId] of Object.entries(sourceAssignments)) {
                if (typeof slotKey === 'string' && slotKey.startsWith(`${copiedTrupp.sourceTruppKey}:`)) {
                    const slotName = slotKey.split(':')[1];
                    const targetSlotKey = `${copiedTrupp.targetTruppKey}:${slotName}`;

                    if (personId) {
                        console.log(`  - Copying ${slotKey} to ${targetSlotKey} on ${targetVehicleKey} with person ${personId}`);
                        assignmentRecords.push({
                            shift_id: shift_id,
                            vehicle_key: targetVehicleKey,
                            slot_key: targetSlotKey,
                            person_id: personId as string,
                            from_trupp_key: copiedTrupp.sourceTruppKey,
                            updated_by: user.id
                        });
                    }
                }
            }
        }
    }

    // Process praktikant flags (create virtual praktikant assignments)
    for (const [vehicleId, hasPraktikant] of Object.entries(praktikantFlags)) {
        if (hasPraktikant) {
            const vehicleKey = vehicleIdToKey.get(vehicleId);
            if (!vehicleKey) {
                console.error(`Vehicle not found for praktikant flag: ${vehicleId}`);
                continue;
            }

            console.log(`Vehicle ${vehicleKey} has praktikant flag set`);

            // Check if there's already a praktikant assignment
            const hasPraktikantAssignment = assignmentRecords.some(
                a => a.vehicle_key === vehicleKey &&
                     (a.slot_key === 'Praktikant' || a.slot_key.toLowerCase().includes('praktikant'))
            );

            // If praktikant flag is set but no assignment exists, create a placeholder
            if (!hasPraktikantAssignment) {
                assignmentRecords.push({
                    shift_id: shift_id,
                    vehicle_key: vehicleKey,
                    slot_key: 'Praktikant',
                    person_id: null,
                    placeholder_text: 'Praktikant',
                    updated_by: user.id
                });
                console.log(`  - Added praktikant placeholder for ${vehicleKey}`);
            }
        }
    }

    // Process trupp praktikant flags (create praktikant placeholders per trupp)
    for (const [vehicleId, trupps] of Object.entries(truppPraktikantFlags)) {
        const vehicleKey = vehicleIdToKey.get(vehicleId);
        if (!vehicleKey) {
            console.error(`Vehicle not found for trupp praktikant flags: ${vehicleId}`);
            continue;
        }

        const truppFlags = trupps as Record<string, boolean>;
        for (const [truppKey, hasPraktikant] of Object.entries(truppFlags)) {
            if (hasPraktikant) {
                console.log(`Trupp ${truppKey} on vehicle ${vehicleKey} has praktikant flag set`);

                // Create a praktikant placeholder for this trupp
                const slotKey = `${truppKey}:Praktikant`;

                // Check if there's already a praktikant assignment for this trupp
                const hasPraktikantAssignment = assignmentRecords.some(
                    a => a.vehicle_key === vehicleKey && a.slot_key === slotKey
                );

                if (!hasPraktikantAssignment) {
                    assignmentRecords.push({
                        shift_id: shift_id,
                        vehicle_key: vehicleKey,
                        slot_key: slotKey,
                        person_id: null,
                        placeholder_text: 'Praktikant',
                        updated_by: user.id
                    });
                    console.log(`  - Added praktikant placeholder for trupp ${truppKey} on ${vehicleKey}`);
                }
            }
        }
    }

    console.log('Total assignment records to insert:', assignmentRecords.length);
    console.log('Assignment records:', assignmentRecords);

    if (assignmentRecords.length > 0) {
        const { error: assignmentsError } = await supabase
            .from('assignments')
            .insert(assignmentRecords as any);

        if (assignmentsError) {
            console.error('Error creating assignments:', assignmentsError);
            console.error('Assignment error details:', JSON.stringify(assignmentsError, null, 2));
            // Don't fail the whole operation
        } else {
            console.log('Assignments created successfully!');
        }
    } else {
        console.log('No assignments to insert.');
    }

    revalidatePath('/app/shifts');
    revalidatePath(`/app/shifts/${shift_id}/edit`);
    redirect('/app/shifts?success=Schicht erfolgreich aktualisiert.');
}

export async function duplicateShift(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const shiftId = formData.get('shiftId') as string;

    if (!shiftId) {
        return redirect('/app/shifts?error=Keine Schicht-ID angegeben.');
    }

    // Get user's station and role
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role, division_ids')
        .eq('user_id', user.id)
        .single<{ station_id: string; role: string; division_ids: string[] | null }>();

    if (!membership || !['ADMIN', 'EDITOR'].includes(membership.role)) {
        return redirect('/app/shifts?error=Keine Berechtigung.');
    }

    // Get the original shift with all assignments
    const { data: originalShift, error: shiftError } = await supabase
        .from('shifts')
        .select(`
            *,
            assignments:assignments(vehicle_key, slot_key, person_id, from_trupp_key, placeholder_text)
        `)
        .eq('id', shiftId)
        .eq('station_id', membership.station_id)
        .single() as any;

    if (shiftError || !originalShift) {
        return redirect('/app/shifts?error=Schicht nicht gefunden.');
    }

    // For EDITOR, verify they have access to this division
    if (membership.role === 'EDITOR') {
        const userDivisions = membership.division_ids || [];
        if (!userDivisions.includes(originalShift.division_id)) {
            return redirect('/app/shifts?error=Sie haben keinen Zugriff auf diese Division.');
        }
    }

    // Create new shift with same data but today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Extract time from original shift
    const originalStart = new Date(originalShift.starts_at);
    const originalEnd = new Date(originalShift.ends_at);

    const startTime = `${String(originalStart.getHours()).padStart(2, '0')}:${String(originalStart.getMinutes()).padStart(2, '0')}`;
    const endTime = `${String(originalEnd.getHours()).padStart(2, '0')}:${String(originalEnd.getMinutes()).padStart(2, '0')}`;

    let starts_at = `${todayStr}T${startTime}:00`;
    let ends_at = `${todayStr}T${endTime}:00`;

    // If end time is before start time, it's next day
    if (endTime <= startTime) {
        const endDate = new Date(todayStr);
        endDate.setDate(endDate.getDate() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];
        ends_at = `${endDateStr}T${endTime}:00`;
    }

    // Create the new shift
    const { data: newShift, error: createError } = await supabase
        .from('shifts')
        .insert({
            station_id: originalShift.station_id,
            division_id: originalShift.division_id,
            starts_at,
            ends_at,
            label: originalShift.label,
            status: 'PUBLISHED',
            wachleitung_im_haus: originalShift.wachleitung_im_haus
        } as any)
        .select()
        .single<{ id: string }>();

    if (createError || !newShift) {
        console.error('Error duplicating shift:', createError);
        
        // Check for duplicate key error
        if (createError?.code === '23505') {
            return redirect(`/app/shifts?error=${encodeURIComponent('Es existiert bereits eine Schicht für diese Wachabteilung zu dieser Startzeit.')}`);
        }

        return redirect(`/app/shifts?error=${encodeURIComponent('Fehler beim Duplizieren der Schicht.')}`);
    }

    // Copy assignments
    if (originalShift.assignments && originalShift.assignments.length > 0) {
        const assignmentRecords = originalShift.assignments.map((assignment: any) => ({
            shift_id: newShift.id,
            vehicle_key: assignment.vehicle_key,
            slot_key: assignment.slot_key,
            person_id: assignment.person_id,
            from_trupp_key: assignment.from_trupp_key,
            placeholder_text: assignment.placeholder_text,
            updated_by: user.id
        }));

        const { error: assignmentsError } = await supabase
            .from('assignments')
            .insert(assignmentRecords);

        if (assignmentsError) {
            console.error('Error copying assignments:', assignmentsError);
            // Don't fail the operation, assignments can be added later
        }
    }

    revalidatePath('/app/shifts');
    redirect('/app/shifts?success=Schicht erfolgreich dupliziert.');
}

export async function deleteShift(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const shiftId = formData.get('shiftId') as string;

    if (!shiftId) {
        return redirect('/app/shifts?error=Keine Schicht-ID angegeben.');
    }

    // Get user's station and role
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role, division_ids')
        .eq('user_id', user.id)
        .single<{ station_id: string; role: string; division_ids: string[] | null }>();

    if (!membership || !['ADMIN', 'EDITOR'].includes(membership.role)) {
        return redirect('/app/shifts?error=Keine Berechtigung.');
    }

    // Get the shift to verify access
    const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .select('id, station_id, division_id')
        .eq('id', shiftId)
        .eq('station_id', membership.station_id)
        .single<{ id: string; station_id: string; division_id: string }>();

    if (shiftError || !shift) {
        return redirect('/app/shifts?error=Schicht nicht gefunden.');
    }

    // For EDITOR, verify they have access to this division
    if (membership.role === 'EDITOR') {
        const userDivisions = membership.division_ids || [];
        if (!userDivisions.includes(shift.division_id)) {
            return redirect('/app/shifts?error=Sie haben keinen Zugriff auf diese Division.');
        }
    }

    // Delete assignments first (cascade should handle this, but being explicit)
    await supabase
        .from('assignments')
        .delete()
        .eq('shift_id', shiftId);

    // Delete the shift
    const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);

    if (deleteError) {
        console.error('Error deleting shift:', deleteError);
        return redirect('/app/shifts?error=Fehler beim Löschen der Schicht.');
    }

    revalidatePath('/app/shifts');
    redirect('/app/shifts?success=Schicht erfolgreich gelöscht.');
}
