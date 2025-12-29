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
        return redirect('/admin/users?error=Fehlende Parameter.');
    }

    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(newRole)) {
        return redirect('/admin/users?error=Ungültige Rolle.');
    }

    // Get user's station and verify admin
    const { data: adminMembership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return redirect('/admin/users?error=Keine Berechtigung.');
    }

    // Get target membership to verify it belongs to same station
    const { data: targetMembership } = await supabase
        .from('memberships')
        .select('station_id, user_id')
        .eq('id', membershipId)
        .single();

    if (!targetMembership || targetMembership.station_id !== adminMembership.station_id) {
        return redirect('/admin/users?error=Mitgliedschaft nicht gefunden.');
    }

    // Prevent admin from changing their own role
    if (targetMembership.user_id === user.id) {
        return redirect('/admin/users?error=Sie können Ihre eigene Rolle nicht ändern.');
    }

    // Update role
    const { error } = await supabase
        .from('memberships')
        .update({ role: newRole })
        .eq('id', membershipId);

    if (error) {
        console.error('Error updating role:', error);
        return redirect(`/admin/users?error=${encodeURIComponent('Fehler beim Aktualisieren der Rolle.')}`);
    }

    revalidatePath('/admin/users');
    redirect('/admin/users?success=Rolle erfolgreich geändert.');
}

export async function removeMembership(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const membershipId = formData.get('membershipId') as string;

    if (!membershipId) {
        return redirect('/admin/users?error=Fehlende Parameter.');
    }

    // Get user's station and verify admin
    const { data: adminMembership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return redirect('/admin/users?error=Keine Berechtigung.');
    }

    // Get target membership to verify it belongs to same station
    const { data: targetMembership } = await supabase
        .from('memberships')
        .select('station_id, user_id')
        .eq('id', membershipId)
        .single();

    if (!targetMembership || targetMembership.station_id !== adminMembership.station_id) {
        return redirect('/admin/users?error=Mitgliedschaft nicht gefunden.');
    }

    // Prevent admin from removing themselves
    if (targetMembership.user_id === user.id) {
        return redirect('/admin/users?error=Sie können sich nicht selbst entfernen.');
    }

    // Delete membership
    const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('id', membershipId);

    if (error) {
        console.error('Error removing membership:', error);
        return redirect(`/admin/users?error=${encodeURIComponent('Fehler beim Entfernen des Benutzers.')}`);
    }

    revalidatePath('/admin/users');
    redirect('/admin/users?success=Benutzer erfolgreich entfernt.');
}
