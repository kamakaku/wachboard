'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uploadPersonPhoto } from "@/lib/storage";

async function handlePhotoUpload(
    file: File | null,
    stationId: string,
    redirectPath: string
) {
    if (!file) return null;
    try {
        return await uploadPersonPhoto(file, stationId);
    } catch (error) {
        console.error("Error uploading person photo:", error);
        redirect(`${redirectPath}?error=${encodeURIComponent("Fehler beim Hochladen des Fotos.")}`);
    }
}

export async function createPerson(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const name = formData.get('name') as string;
    const rank = formData.get('rank') as string;
    const tagsString = formData.get('tags') as string;
    const photo_url = formData.get('photo_url') as string;
    const photo_file = formData.get('photo_file') as File | null;
    const person_type = formData.get('person_type') as string | null;

    if (!name || name.trim() === '') {
        return redirect('/admin/people?error=Name ist erforderlich.');
    }

    // Parse tags (comma-separated)
    const tags = tagsString
        ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

    // Get user's station
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/admin/people?error=Keine Berechtigung.');
    }

    // Create person
    const resolvedPhotoUrl =
        (await handlePhotoUpload(photo_file, membership.station_id, "/admin/people")) ??
        (photo_url ?? null);

    const { error } = await supabase
        .from('people')
        .insert({
            station_id: membership.station_id,
            name: name.trim(),
            rank: rank ? rank.trim() : null,
            tags: tags.length > 0 ? tags : null,
            photo_url: resolvedPhotoUrl,
            person_type: person_type || 'MITARBEITER',
            active: true
        });

    if (error) {
        console.error('Error creating person:', error);
        return redirect(`/admin/people?error=${encodeURIComponent('Fehler beim Erstellen der Person.')}`);
    }

    revalidatePath('/admin/people');
    redirect('/admin/people?success=Person erfolgreich hinzugefügt.');
}

export async function togglePersonActive(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const personId = formData.get('personId') as string;
    const currentStatus = formData.get('currentStatus') === 'true';

    if (!personId) {
        return redirect('/admin/people?error=Person nicht gefunden.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/admin/people?error=Keine Berechtigung.');
    }

    // Verify person belongs to user's station
    const { data: person } = await supabase
        .from('people')
        .select('station_id')
        .eq('id', personId)
        .single();

    if (!person || person.station_id !== membership.station_id) {
        return redirect('/admin/people?error=Person nicht gefunden.');
    }

    // Toggle active status
    const { error } = await supabase
        .from('people')
        .update({ active: !currentStatus })
        .eq('id', personId);

    if (error) {
        console.error('Error updating person:', error);
        return redirect(`/admin/people?error=${encodeURIComponent('Fehler beim Aktualisieren der Person.')}`);
    }

    revalidatePath('/admin/people');
    redirect('/admin/people?success=Status erfolgreich geändert.');
}

export async function deletePerson(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const personId = formData.get('personId') as string;

    if (!personId) {
        return redirect('/admin/people?error=Person nicht gefunden.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/admin/people?error=Keine Berechtigung.');
    }

    // Verify person belongs to user's station
    const { data: person } = await supabase
        .from('people')
        .select('station_id')
        .eq('id', personId)
        .single();

    if (!person || person.station_id !== membership.station_id) {
        return redirect('/admin/people?error=Person nicht gefunden.');
    }

    // Delete person
    const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', personId);

    if (error) {
        console.error('Error deleting person:', error);
        return redirect(`/admin/people?error=${encodeURIComponent('Fehler beim Löschen der Person.')}`);
    }

    revalidatePath('/admin/people');
    redirect('/admin/people?success=Person erfolgreich gelöscht.');
}

export async function updatePerson(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const personId = formData.get('personId') as string;
    const name = (formData.get('name') as string | null)?.trim() ?? "";
    const rank = (formData.get('rank') as string | null)?.trim() ?? "";
    const tagsString = (formData.get('tags') as string | null) ?? "";
    const photo_url = (formData.get('photo_url') as string | null)?.trim() ?? "";
    const photo_file = formData.get("photo_file") as File | null;

    if (!personId || name === "") {
        return redirect('/admin/people?error=Name ist erforderlich.');
    }

    const tags = tagsString
        ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/admin/people?error=Keine Berechtigung.');
    }

    const { data: person } = await supabase
        .from('people')
        .select('station_id')
        .eq('id', personId)
        .single();

    if (!person || person.station_id !== membership.station_id) {
        return redirect('/admin/people?error=Person nicht gefunden.');
    }

    const resolvedPhotoUrl =
        (await handlePhotoUpload(photo_file, membership.station_id, "/admin/people")) ??
        (photo_url ?? null);

    const { error } = await supabase
        .from('people')
        .update({
            name,
            rank: rank || null,
            tags: tags.length > 0 ? tags : null,
            photo_url: resolvedPhotoUrl
        })
        .eq('id', personId);

    if (error) {
        console.error('Error updating person:', error);
        return redirect(`/admin/people?error=${encodeURIComponent('Fehler beim Aktualisieren der Person.')}`);
    }

    revalidatePath('/admin/people');
    redirect('/admin/people?success=Person erfolgreich aktualisiert.');
}
