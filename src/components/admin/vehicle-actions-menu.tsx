"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal } from "lucide-react";
import { VehicleConfigBuilder } from "@/components/admin/vehicle-config-builder";
import { updateVehicle, deleteVehicle } from "@/lib/actions/vehicle.actions";

type VehicleActionsMenuProps = {
  vehicle: any;
};

export function VehicleActionsMenu({ vehicle }: VehicleActionsMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Bearbeiten
            </DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuItem
            className="text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              const form = document.getElementById(`delete-vehicle-${vehicle.id}`) as HTMLFormElement;
              form?.requestSubmit();
            }}
          >
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fahrzeug bearbeiten</DialogTitle>
          <DialogDescription>
            Schlüssel, Titel und Konfiguration anpassen.
          </DialogDescription>
        </DialogHeader>
        <form action={updateVehicle} className="space-y-4">
          <input
            type="hidden"
            name="vehicleId"
            value={vehicle.id}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`edit-key-${vehicle.id}`}>
                Schlüssel *
              </Label>
              <Input
                id={`edit-key-${vehicle.id}`}
                name="key"
                defaultValue={vehicle.key}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor={`edit-title-${vehicle.id}`}
              >
                Titel *
              </Label>
              <Input
                id={`edit-title-${vehicle.id}`}
                name="title"
                defaultValue={vehicle.title}
                required
              />
            </div>
          </div>
          <VehicleConfigBuilder
            fieldName="config"
            initialConfig={vehicle.config}
          />
          <div className="grid gap-2">
            <Label htmlFor={`edit-image-url-${vehicle.id}`}>Bild-URL (optional)</Label>
            <Input
              id={`edit-image-url-${vehicle.id}`}
              name="image_url"
              type="url"
              placeholder="https://..."
              defaultValue={vehicle.image_url ?? ""}
            />
            <Button variant="outline" type="button" asChild>
              <label>
                Bild hochladen
                <input type="file" name="image_file" accept="image/*" className="hidden" />
              </label>
            </Button>
          </div>
          <DialogFooter>
            <Button type="submit">Speichern</Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <form id={`delete-vehicle-${vehicle.id}`} action={deleteVehicle} className="hidden">
        <input
          type="hidden"
          name="vehicleId"
          value={vehicle.id}
        />
      </form>
    </Dialog>
  );
}
