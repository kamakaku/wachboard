'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function generateShiftsForNext30Days() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated");
    }

    // 1. Get user's station and admin role
    const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .limit(1)
        .single();
    
    if (membershipError || !membership) {
        throw new Error("User has no station membership.");
    }

    if (membership.role !== 'ADMIN') {
        throw new Error("User is not an admin.");
    }

    const stationId = membership.station_id;

    // 2. Get schedule cycle and shift templates for the station
    const { data: cycle, error: cycleError } = await supabase
        .from('schedule_cycles')
        .select('*')
        .eq('station_id', stationId)
        .single();

    if (cycleError || !cycle) {
        throw new Error("Schedule cycle not configured for this station.");
    }

    const { data: templates, error: templatesError } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('station_id', stationId);

    if (templatesError || !templates || templates.length === 0) {
        throw new Error("Shift templates not configured for this station.");
    }

    const dayTemplate = templates.find((t) => t.label === "DAY");
    const nightTemplate = templates.find((t) => t.label === "NIGHT");

    if (!dayTemplate || !nightTemplate) {
        throw new Error("Both DAY and NIGHT shift templates must exist.");
    }

    // 3. Generate shifts for the next 30 days
    const divisionIds = cycle.order_division_ids ?? [];
    if (divisionIds.length === 0) {
        throw new Error("Schedule cycle must contain at least one division.");
    }

    const shiftsToCreate = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(cycle.start_date);

    for (let i = 0; i < 30; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);

        const diffDays = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const numDivisions = divisionIds.length;

        // Determine which divisions are on duty today
        const wrapIndex = (value: number) => ((value % numDivisions) + numDivisions) % numDivisions;
        const dayDivisionIndex = wrapIndex(diffDays);
        const nightDivisionIndex = wrapIndex(diffDays + Math.floor(cycle.switch_hours / 24));

        const dayDivisionId = divisionIds[dayDivisionIndex];
        const nightDivisionId = divisionIds[nightDivisionIndex];
        if (!dayDivisionId || !nightDivisionId) {
            console.warn("Skipping shift insert for missing division id", {
                dayDivisionId,
                nightDivisionId,
                diffDays,
            });
            continue;
        }
        
        // Day Shift
        const dayStartsAt = new Date(currentDate);
        const [dayStartHour, dayStartMinute] = dayTemplate.start_time.split(':').map(Number);
        dayStartsAt.setHours(dayStartHour, dayStartMinute, 0, 0);

        const dayEndsAt = new Date(currentDate);
        const [dayEndHour, dayEndMinute] = dayTemplate.end_time.split(':').map(Number);
        dayEndsAt.setHours(dayEndHour, dayEndMinute, 0, 0);
        if (dayEndsAt <= dayStartsAt) dayEndsAt.setDate(dayEndsAt.getDate() + 1);

        shiftsToCreate.push({
            station_id: stationId,
            division_id: dayDivisionId,
            starts_at: dayStartsAt.toISOString(),
            ends_at: dayEndsAt.toISOString(),
            label: 'DAY',
            status: 'DRAFT',
        });

        // Night Shift
        const nightStartsAt = new Date(currentDate);
        const [nightStartHour, nightStartMinute] = nightTemplate.start_time.split(':').map(Number);
        nightStartsAt.setHours(nightStartHour, nightStartMinute, 0, 0);

        const nightEndsAt = new Date(currentDate);
        const [nightEndHour, nightEndMinute] = nightTemplate.end_time.split(':').map(Number);
        nightEndsAt.setHours(nightEndHour, nightEndMinute, 0, 0);
        nightEndsAt.setDate(nightEndsAt.getDate() + 1); // Night shift always ends next day

        shiftsToCreate.push({
            station_id: stationId,
            division_id: nightDivisionId,
            starts_at: nightStartsAt.toISOString(),
            ends_at: nightEndsAt.toISOString(),
            label: 'NIGHT',
            status: 'DRAFT',
        });
    }

    // 4. Insert shifts, ignoring duplicates
    const { error: insertError } = await supabase
        .from('shifts')
        .insert(shiftsToCreate, {
            onConflict: 'division_id, starts_at'
        });

    if (insertError) {
        console.error("Error inserting shifts:", insertError);
        throw new Error(`Failed to generate shifts: ${insertError.message}`);
    }

    revalidatePath('/app');
    revalidatePath('/admin');
    redirect('/admin?success=Shifts generated successfully');
}
