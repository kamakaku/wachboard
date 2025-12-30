"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { updateStationSettings } from "@/lib/actions/stations.actions";

type StationSettingsFormProps = {
  stationId: string;
  currentName: string;
  currentCrestUrl: string | null;
};

export function StationSettingsForm({ stationId, currentName, currentCrestUrl }: StationSettingsFormProps) {
  const [name, setName] = useState(currentName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCrestUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    await updateStationSettings(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="station_id" value={stationId} />

      <div>
        <Label htmlFor="name">Name der Wache</Label>
        <Input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="max-w-md"
        />
      </div>

      <div>
        <Label htmlFor="crest_image">Wappen / Logo</Label>
        <div className="mt-2 space-y-4">
          {previewUrl && (
            <div className="border rounded p-4 inline-block bg-gray-50">
              <Image
                src={previewUrl}
                alt="Wappen Vorschau"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
          )}
          <div>
            <Input
              id="crest_image"
              name="crest_image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Unterstützte Formate: PNG, JPG, SVG. Empfohlene Größe: 512x512 Pixel
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Wird gespeichert...' : 'Änderungen speichern'}
      </Button>
    </form>
  );
}
