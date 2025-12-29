import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types";

const serviceClient = createServiceClient();

function resolveExtension(fileName: string, mimeType: string) {
  const hasDot = fileName?.lastIndexOf(".") ?? -1;
  if (hasDot > 0) {
    return fileName.slice(hasDot + 1);
  }
  const [, ext] = mimeType.split("/");
  return ext || "bin";
}

async function uploadToBucket(bucket: string, path: string, file: File) {
  const { error } = await serviceClient.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const { data: publicUrl } = serviceClient.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrl.publicUrl;
}

export async function uploadPersonPhoto(file: File, stationId: string) {
  const extension = resolveExtension(file.name, file.type);
  const path = `people/${stationId}/${crypto.randomUUID()}.${extension}`;
  return uploadToBucket("people-photos", path, file);
}

export async function uploadVehiclePhoto(file: File, stationId: string) {
  const extension = resolveExtension(file.name, file.type);
  const path = `vehicles/${stationId}/${crypto.randomUUID()}.${extension}`;
  return uploadToBucket("vehicle-photos", path, file);
}
