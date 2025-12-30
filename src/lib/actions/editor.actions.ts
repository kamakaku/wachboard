'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache";

interface AssignmentPayload {
    shiftId: string;
    vehicleKey: string;
    slotKey: string;
    personId: string | null;
}

export async function assignPersonToSlot(payload: AssignmentPayload) {
    const { shiftId, vehicleKey, slotKey, personId } = payload;
    
    const supabase = createClient();
     const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Not authenticated");
    }

    // RLS will enforce if the user is an EDITOR or ADMIN for the correct division/station.

    // Check if this person is already assigned somewhere else in this shift
    if (personId) {
        const { data: existing, error: existingError } = await supabase
            .from('assignments')
            .select('id')
            .eq('shift_id', shiftId)
            .eq('person_id', personId)
            // Exclude the current slot we are trying to assign to
            .not('slot_key', 'eq', slotKey) 
            .limit(1);

        if (existingError) {
             console.error("Error checking for existing assignment:", existingError);
             return { success: false, message: 'Server error when checking for duplicates.' };
        }
        
        if (existing && existing.length > 0) {
            return { success: false, message: 'Person is already assigned in this shift.' };
        }
    }


    const { data, error } = await supabase
        .from('assignments')
        .upsert({
            shift_id: shiftId,
            vehicle_key: vehicleKey,
            slot_key: slotKey,
            person_id: personId,
            updated_by: user.id,
        } as any, {
            onConflict: 'shift_id, vehicle_key, slot_key'
        })
        .select()
        .single();

    if (error) {
        console.error("Error upserting assignment:", error);
        return { success: false, message: error.message };
    }

    revalidatePath(`/app/editor/${shiftId}`);

    return { success: true, data };
}
