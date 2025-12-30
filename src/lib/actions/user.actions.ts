'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateUserRole(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const membershipId = formData.get('membershipId') as string;
    const newRole = formData.get('newRole') as string;

    if (!membershipId || !newRole) {
        return redirect('/app/users?error=Fehlende Parameter.');
    }

    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(newRole)) {
        return redirect('/app/users?error=Ungültige Rolle.');
    }

    // Get user's station and verify admin
    const { data: adminMembership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single<{ station_id: string; role: string }>();

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return redirect('/app/users?error=Keine Berechtigung.');
    }

    // Get target membership to verify it belongs to same station
    const { data: targetMembership } = await supabase
        .from('memberships')
        .select('station_id, user_id')
        .eq('id', membershipId)
        .single<{ station_id: string; user_id: string }>();

    if (!targetMembership || targetMembership.station_id !== adminMembership.station_id) {
        return redirect('/app/users?error=Mitgliedschaft nicht gefunden.');
    }

    // Prevent admin from changing their own role
    if (targetMembership.user_id === user.id) {
        return redirect('/app/users?error=Sie können Ihre eigene Rolle nicht ändern.');
    }

    // Update role
    const { error } = await (supabase
        .from('memberships')
        .update as any)({ role: newRole })
        .eq('id', membershipId);

    if (error) {
        console.error('Error updating role:', error);
        return redirect(`/app/users?error=${encodeURIComponent('Fehler beim Aktualisieren der Rolle.')}`);
    }

    revalidatePath('/app/users');
    redirect('/app/users?success=Rolle erfolgreich geändert.');
}

export async function removeMembership(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const membershipId = formData.get('membershipId') as string;

    if (!membershipId) {
        return redirect('/app/users?error=Fehlende Parameter.');
    }

    // Get user's station and verify admin
    const { data: adminMembership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single<{ station_id: string; role: string }>();

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return redirect('/app/users?error=Keine Berechtigung.');
    }

    // Get target membership to verify it belongs to same station
    const { data: targetMembership } = await supabase
        .from('memberships')
        .select('station_id, user_id')
        .eq('id', membershipId)
        .single<{ station_id: string; user_id: string }>();

    if (!targetMembership || targetMembership.station_id !== adminMembership.station_id) {
        return redirect('/app/users?error=Mitgliedschaft nicht gefunden.');
    }

    // Prevent admin from removing themselves
    if (targetMembership.user_id === user.id) {
        return redirect('/app/users?error=Sie können sich nicht selbst entfernen.');
    }

    // Delete membership
    const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('id', membershipId);

    if (error) {
        console.error('Error removing membership:', error);
        return redirect(`/app/users?error=${encodeURIComponent('Fehler beim Entfernen des Benutzers.')}`);
    }

    revalidatePath('/app/users');
    redirect('/app/users?success=Benutzer erfolgreich entfernt.');
}

export async function updateUserDivisions(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const membershipId = formData.get('membershipId') as string;
    const divisionIdsString = formData.get('divisionIds') as string;

    if (!membershipId) {
        return redirect('/app/users?error=Fehlende Parameter.');
    }

    // Parse division IDs (comma-separated string to array)
    const divisionIds = divisionIdsString
        ? divisionIdsString.split(',').filter(id => id.trim() !== '')
        : [];

    // Get user's station and verify admin
    const { data: adminMembership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single<{ station_id: string; role: string }>();

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return redirect('/app/users?error=Keine Berechtigung.');
    }

    // Get target membership to verify it belongs to same station
    const { data: targetMembership } = await supabase
        .from('memberships')
        .select('station_id, user_id, role')
        .eq('id', membershipId)
        .single<{ station_id: string; user_id: string; role: string }>();

    if (!targetMembership || targetMembership.station_id !== adminMembership.station_id) {
        return redirect('/app/users?error=Mitgliedschaft nicht gefunden.');
    }

    // Only EDITORs should have division assignments
    if (targetMembership.role !== 'EDITOR') {
        return redirect('/app/users?error=Divisionen können nur für EDITORs zugewiesen werden.');
    }

    // Verify all division IDs belong to the same station
    if (divisionIds.length > 0) {
        const { data: divisions, error: divError } = await supabase
            .from('divisions')
            .select('id')
            .eq('station_id', adminMembership.station_id)
            .in('id', divisionIds);

        if (divError || !divisions || divisions.length !== divisionIds.length) {
            return redirect('/app/users?error=Ungültige Division(en) ausgewählt.');
        }
    }

    // Update division_ids
    const { error } = await (supabase
        .from('memberships')
        .update as any)({
            division_ids: divisionIds.length > 0 ? divisionIds : null,
            // Also update the old division_id field for backward compatibility
            division_id: divisionIds.length > 0 ? divisionIds[0] : null
        })
        .eq('id', membershipId);

    if (error) {
        console.error('Error updating divisions:', error);
        return redirect(`/app/users?error=${encodeURIComponent('Fehler beim Aktualisieren der Divisionen.')}`);
    }

    revalidatePath('/app/users');
    redirect('/app/users?success=Divisionen erfolgreich aktualisiert.');
}
