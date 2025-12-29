'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Create a new station and make the current user an admin
 */
export async function createStationAndBecomeAdmin(formData: FormData) {
    const supabase = createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log('Auth check:', { user: user?.id, email: user?.email, error: userError });

    if (!user) {
        return redirect('/onboarding?error=Sie sind nicht angemeldet. Bitte melden Sie sich an.');
    }

    const stationName = formData.get('stationName') as string;
    const organizationName = formData.get('organizationName') as string;

    console.log('Creating station:', { stationName, organizationName, userId: user.id });

    if (!stationName || stationName.trim() === '') {
        return redirect('/onboarding?error=Wachen-Name ist erforderlich.');
    }

    // 1. Check if user already has a membership
    const { data: existingMembership } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

    if (existingMembership) {
        return redirect('/app');
    }

    // 2. Get or create organization
    let orgId: string;

    if (organizationName && organizationName.trim() !== '') {
        // Create new organization
        const { data: newOrg, error: orgError } = await supabase
            .from('organizations')
            .insert({ name: organizationName.trim() })
            .select('id')
            .single();

        if (orgError || !newOrg) {
            console.error('Error creating organization:', orgError);
            const errorMessage = orgError ? `${orgError.message} (Code: ${orgError.code})` : 'Unbekannter Fehler';
            return redirect(`/onboarding?error=${encodeURIComponent(`Fehler beim Erstellen der Organisation: ${errorMessage}`)}`);
        }
        orgId = newOrg.id;
    } else {
        // Use default organization or create one
        const { data: defaultOrg } = await supabase
            .from('organizations')
            .select('id')
            .limit(1)
            .single();

        if (defaultOrg) {
            orgId = defaultOrg.id;
        } else {
            const { data: newOrg, error: orgError } = await supabase
                .from('organizations')
                .insert({ name: 'Standard Organisation' })
                .select('id')
                .single();

            if (orgError || !newOrg) {
                console.error('Error creating default organization:', orgError);
                const errorMessage = orgError ? `${orgError.message} (Code: ${orgError.code})` : 'Unbekannter Fehler';
                return redirect(`/onboarding?error=${encodeURIComponent(`Fehler beim Erstellen der Standard-Organisation: ${errorMessage}`)}`);
            }
            orgId = newOrg.id;
        }
    }

    // 3. Create station
    const { data: station, error: stationError } = await supabase
        .from('stations')
        .insert({
            org_id: orgId,
            name: stationName.trim()
        })
        .select('id')
        .single();

    if (stationError || !station) {
        console.error('Error creating station:', stationError);
        const errorMessage = stationError ? `${stationError.message} (Code: ${stationError.code})` : 'Unbekannter Fehler';
        return redirect(`/onboarding?error=${encodeURIComponent(`Fehler beim Erstellen der Wache: ${errorMessage}`)}`);
    }

    // 4. Create membership for user as ADMIN
    console.log('Attempting to create membership:', { user_id: user.id, station_id: station.id, role: 'ADMIN' });

    const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .insert({
            user_id: user.id,
            station_id: station.id,
            role: 'ADMIN'
        })
        .select();

    console.log('Membership result:', { data: membershipData, error: membershipError });

    if (membershipError) {
        console.error('Error creating membership:', membershipError);
        const errorMessage = membershipError ? `${membershipError.message} (Code: ${membershipError.code}, Details: ${membershipError.details})` : 'Unbekannter Fehler';
        return redirect(`/onboarding?error=${encodeURIComponent(`Fehler beim Zuweisen der Admin-Rolle: ${errorMessage}`)}`);
    }

    revalidatePath('/app');
    redirect('/app');
}

/**
 * Request to join an existing station
 */
export async function requestToJoinStation(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const stationId = formData.get('stationId') as string;

    if (!stationId) {
        return redirect('/onboarding?error=Keine Wache ausgewählt.');
    }

    // 1. Check if user already has a membership
    const { data: existingMembership } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

    if (existingMembership) {
        return redirect('/app');
    }

    // 2. Check if station exists
    const { data: station, error: stationError } = await supabase
        .from('stations')
        .select('id, name')
        .eq('id', stationId)
        .single();

    if (stationError || !station) {
        return redirect('/onboarding?error=Wache nicht gefunden.');
    }

    // 3. Create join request
    const { error: requestError } = await supabase
        .from('join_requests')
        .insert({
            user_id: user.id,
            station_id: stationId,
            status: 'PENDING'
        });

    if (requestError) {
        console.error('Error creating join request:', requestError);
        // Check if it's a duplicate request
        if (requestError.code === '23505') {
            return redirect('/onboarding?success=Sie haben bereits eine Anfrage für diese Wache gestellt.');
        }
        return redirect(`/onboarding?error=${encodeURIComponent('Fehler beim Senden der Beitrittsanfrage.')}`);
    }

    redirect('/onboarding?success=Beitrittsanfrage gesendet! Warten Sie auf die Bestätigung eines Administrators.');
}

/**
 * Get all available stations (for selection)
 */
export async function getAllStations() {
    const supabase = createClient();

    const { data: stations, error } = await supabase
        .from('stations')
        .select('id, name, org:organizations(name)')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching stations:', error);
        return [];
    }

    return stations || [];
}

/**
 * Accept a join request (Admin only)
 */
export async function acceptJoinRequest(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const requestId = formData.get('requestId') as string;
    const divisionId = formData.get('divisionId') as string | null;
    const role = formData.get('role') as string;

    if (!requestId || !role) {
        return redirect('/admin?error=Fehlende Parameter.');
    }

    // 1. Get the join request
    const { data: request, error: requestError } = await supabase
        .from('join_requests')
        .select('*, station:stations(id)')
        .eq('id', requestId)
        .single();

    if (requestError || !request) {
        return redirect('/admin?error=Beitrittsanfrage nicht gefunden.');
    }

    // 2. Verify user is admin of the station
    const { data: membership } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('station_id', request.station.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/admin?error=Keine Berechtigung.');
    }

    // 3. Create membership
    const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
            user_id: request.user_id,
            station_id: request.station_id,
            division_id: divisionId,
            role: role
        });

    if (membershipError) {
        console.error('Error creating membership:', membershipError);
        return redirect('/admin?error=Fehler beim Erstellen der Mitgliedschaft.');
    }

    // 4. Update join request status
    const { error: updateError } = await supabase
        .from('join_requests')
        .update({ status: 'APPROVED' })
        .eq('id', requestId);

    if (updateError) {
        console.error('Error updating join request:', updateError);
    }

    revalidatePath('/admin');
    redirect('/admin?success=Beitrittsanfrage akzeptiert.');
}

/**
 * Reject a join request (Admin only)
 */
export async function rejectJoinRequest(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const requestId = formData.get('requestId') as string;

    if (!requestId) {
        return redirect('/admin?error=Fehlende Parameter.');
    }

    // 1. Get the join request
    const { data: request, error: requestError } = await supabase
        .from('join_requests')
        .select('*, station:stations(id)')
        .eq('id', requestId)
        .single();

    if (requestError || !request) {
        return redirect('/admin?error=Beitrittsanfrage nicht gefunden.');
    }

    // 2. Verify user is admin of the station
    const { data: membership } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('station_id', request.station.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/admin?error=Keine Berechtigung.');
    }

    // 3. Update join request status
    const { error: updateError } = await supabase
        .from('join_requests')
        .update({ status: 'REJECTED' })
        .eq('id', requestId);

    if (updateError) {
        console.error('Error updating join request:', updateError);
        return redirect('/admin?error=Fehler beim Ablehnen der Anfrage.');
    }

    revalidatePath('/admin');
    redirect('/admin?success=Beitrittsanfrage abgelehnt.');
}
