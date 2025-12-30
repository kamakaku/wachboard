'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateStationSettings(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const stationId = formData.get('station_id') as string;
    const name = formData.get('name') as string;
    const crestFile = formData.get('crest_image') as File | null;

    if (!stationId || !name) {
        return redirect('/app/settings?error=Name ist erforderlich.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single<{ station_id: string; role: string }>();

    if (!membership || membership.role !== 'ADMIN' || membership.station_id !== stationId) {
        return redirect('/app/settings?error=Keine Berechtigung.');
    }

    let crestUrl: string | null = null;

    // Upload crest image if provided
    if (crestFile && crestFile.size > 0) {
        const fileExt = crestFile.name.split('.').pop();
        const fileName = `${stationId}/crest.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('station-assets')
            .upload(fileName, crestFile, {
                upsert: true,
                contentType: crestFile.type
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return redirect(`/app/settings?error=${encodeURIComponent('Fehler beim Hochladen des Bildes: ' + uploadError.message)}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('station-assets')
            .getPublicUrl(fileName);

        crestUrl = publicUrl;
    }

    // Update station
    const updateData: any = { name };
    if (crestUrl) {
        updateData.crest_url = crestUrl;
    }

    const { error: updateError } = await (supabase
        .from('stations')
        .update as any)(updateData)
        .eq('id', stationId);

    if (updateError) {
        console.error('Update error:', updateError);
        return redirect(`/app/settings?error=${encodeURIComponent('Fehler beim Aktualisieren: ' + updateError.message)}`);
    }

    revalidatePath('/app/settings');
    revalidatePath(`/display/${stationId}`);
    redirect('/app/settings?success=Einstellungen erfolgreich aktualisiert.');
}
