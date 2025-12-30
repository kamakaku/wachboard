'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uploadVehiclePhoto } from "@/lib/storage";

async function handleVehiclePhotoUpload(
    file: File | null,
    stationId: string,
    redirectPath: string
) {
    if (!file || file.size === 0) return null;
    try {
        return await uploadVehiclePhoto(file, stationId);
    } catch (error) {
        console.error("Error uploading vehicle photo:", error);
        // Don't fail the whole operation if image upload fails, just log it
        return null;
    }
}

export async function createVehicle(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const key = formData.get('key') as string;
    const title = formData.get('title') as string;
    const configString = formData.get('config') as string;
    const imageUrlInput = (formData.get('image_url') as string | null)?.trim() ?? "";
    const imageFile = formData.get('image_file') as File | null;

    console.log('[createVehicle] Received data:', { key, title, configStringLength: configString?.length });

    if (!key || !title || !configString) {
        return redirect('/app/vehicles?error=Alle Felder sind erforderlich.');
    }

    // Validate JSON
    let config;
    try {
        config = JSON.parse(configString);
        console.log('[createVehicle] Parsed config:', config);
    } catch (e) {
        console.error('[createVehicle] JSON parse error:', e);
        return redirect('/app/vehicles?error=Ungültiges JSON-Format.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/app/vehicles?error=Keine Berechtigung.');
    }

    // Get current max order
    const { data: maxOrderVehicle } = await supabase
        .from('vehicle_configs')
        .select('order')
        .eq('station_id', membership.station_id)
        .order('order', { ascending: false })
        .limit(1)
        .single();

    const newOrder = maxOrderVehicle ? maxOrderVehicle.order + 1 : 0;

        const resolvedImageUrl =
            (await handleVehiclePhotoUpload(imageFile, membership.station_id, "/app/vehicles")) ??
            (imageUrlInput ?? null);

    // Create vehicle
    console.log('[createVehicle] Inserting vehicle with data:', {
        station_id: membership.station_id,
        key: key.trim(),
        title: title.trim(),
        order: newOrder,
        config,
        image_url: resolvedImageUrl
    });

    const { error } = await supabase
        .from('vehicle_configs')
        .insert({
            station_id: membership.station_id,
            key: key.trim(),
            title: title.trim(),
            order: newOrder,
            config,
            image_url: resolvedImageUrl
        });

    if (error) {
        console.error('[createVehicle] Database error:', error);
        if (error.code === '23505') {
            return redirect('/app/vehicles?error=Ein Fahrzeug mit diesem Schlüssel existiert bereits.');
        }
        return redirect(`/app/vehicles?error=${encodeURIComponent(`Fehler beim Erstellen des Fahrzeugs: ${error.message}`)}`);
    }

    revalidatePath('/app/vehicles');
    redirect('/app/vehicles?success=Fahrzeug erfolgreich erstellt.');
}

export async function deleteVehicle(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const vehicleId = formData.get('vehicleId') as string;

    if (!vehicleId) {
        return redirect('/app/vehicles?error=Fahrzeug nicht gefunden.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/app/vehicles?error=Keine Berechtigung.');
    }

    // Verify vehicle belongs to user's station
    const { data: vehicle } = await supabase
        .from('vehicle_configs')
        .select('station_id')
        .eq('id', vehicleId)
        .single();

    if (!vehicle || vehicle.station_id !== membership.station_id) {
        return redirect('/app/vehicles?error=Fahrzeug nicht gefunden.');
    }

    // Delete vehicle
    const { error } = await supabase
        .from('vehicle_configs')
        .delete()
        .eq('id', vehicleId);

    if (error) {
        console.error('Error deleting vehicle:', error);
        return redirect(`/app/vehicles?error=${encodeURIComponent('Fehler beim Löschen des Fahrzeugs.')}`);
    }

    revalidatePath('/app/vehicles');
    redirect('/app/vehicles?success=Fahrzeug erfolgreich gelöscht.');
}

export async function updateVehicleOrder(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const vehicleId = formData.get('vehicleId') as string;
    const direction = formData.get('direction') as string;

    if (!vehicleId || !direction) {
        return redirect('/app/vehicles?error=Fehlende Parameter.');
    }

    // Get user's station and verify admin
    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/app/vehicles?error=Keine Berechtigung.');
    }

    // Get current vehicle
    const { data: vehicle } = await supabase
        .from('vehicle_configs')
        .select('*')
        .eq('id', vehicleId)
        .eq('station_id', membership.station_id)
        .single();

    if (!vehicle) {
        return redirect('/app/vehicles?error=Fahrzeug nicht gefunden.');
    }

    // Get all vehicles to reorder
    const { data: vehicles } = await supabase
        .from('vehicle_configs')
        .select('*')
        .eq('station_id', membership.station_id)
        .order('order', { ascending: true });

    if (!vehicles) {
        return redirect('/app/vehicles?error=Fehler beim Laden der Fahrzeuge.');
    }

    const currentIndex = vehicles.findIndex(v => v.id === vehicleId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= vehicles.length) {
        return redirect('/app/vehicles');
    }

    // Swap orders
    const temp = vehicles[currentIndex].order;
    vehicles[currentIndex].order = vehicles[newIndex].order;
    vehicles[newIndex].order = temp;

    // Update both vehicles
    await supabase
        .from('vehicle_configs')
        .update({ order: vehicles[currentIndex].order })
        .eq('id', vehicles[currentIndex].id);

    await supabase
        .from('vehicle_configs')
        .update({ order: vehicles[newIndex].order })
        .eq('id', vehicles[newIndex].id);

    revalidatePath('/app/vehicles');
    redirect('/app/vehicles');
}

export async function updateVehicle(formData: FormData) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const vehicleId = formData.get('vehicleId') as string;
    const key = (formData.get('key') as string)?.trim();
    const title = (formData.get('title') as string)?.trim();
    const configString = formData.get('config') as string;
    const imageUrlInput = (formData.get('image_url') as string | null)?.trim() ?? "";
    const imageFile = formData.get('image_file') as File | null;

    if (!vehicleId || !key || !title || !configString) {
        return redirect('/app/vehicles?error=Alle Felder sind erforderlich.');
    }

    let config;
    try {
        config = JSON.parse(configString);
    } catch (e) {
        return redirect('/app/vehicles?error=Ungültiges JSON-Format.');
    }

    const { data: membership } = await supabase
        .from('memberships')
        .select('station_id, role')
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'ADMIN') {
        return redirect('/app/vehicles?error=Keine Berechtigung.');
    }

    const { data: vehicle } = await supabase
        .from('vehicle_configs')
        .select('station_id')
        .eq('id', vehicleId)
        .single();

    if (!vehicle || vehicle.station_id !== membership.station_id) {
        return redirect('/app/vehicles?error=Fahrzeug nicht gefunden.');
    }

    const { data: duplicate } = await supabase
        .from('vehicle_configs')
        .select('id')
        .eq('station_id', membership.station_id)
        .eq('key', key)
        .neq('id', vehicleId)
        .limit(1)
        .single();

    if (duplicate) {
        return redirect('/app/vehicles?error=Ein Fahrzeug mit diesem Schlüssel existiert bereits.');
    }

        const resolvedImageUrl =
            (await handleVehiclePhotoUpload(imageFile, membership.station_id, "/app/vehicles")) ??
            (imageUrlInput ?? null);

    const { error } = await supabase
        .from('vehicle_configs')
        .update({
            key,
            title,
            config,
            image_url: resolvedImageUrl
        })
        .eq('id', vehicleId);

    if (error) {
        console.error('Error updating vehicle:', error);
        if (error.code === '23505') {
            return redirect('/app/vehicles?error=Ein Fahrzeug mit diesem Schlüssel existiert bereits.');
        }
        return redirect(`/app/vehicles?error=${encodeURIComponent('Fehler beim Aktualisieren des Fahrzeugs.')}`);
    }

    revalidatePath('/app/vehicles');
    redirect('/app/vehicles?success=Fahrzeug erfolgreich aktualisiert.');
}
