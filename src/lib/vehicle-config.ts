import type { VehicleConfig, VehicleSlotDefinition, VehicleTrupp } from "@/types";

export interface NormalizedVehicleSlot {
  key: string;
  label: string;
  description?: string;
}

export interface NormalizedVehicleTrupp {
  key: string;
  label: string;
  description?: string;
  slots: NormalizedVehicleSlot[];
}

export function normalizeVehicleSlot(slot: VehicleSlotDefinition): NormalizedVehicleSlot {
  if (typeof slot === "string") {
    return {
      key: slot,
      label: slot,
    };
  }

  return {
    key: slot.key,
    label: slot.label ?? slot.key,
    description: slot.description,
  };
}

export function normalizeVehicleTrupp(trupp: VehicleTrupp): NormalizedVehicleTrupp {
  return {
    ...trupp,
    slots: trupp.slots.map(normalizeVehicleSlot),
  };
}

export function flattenVehicleConfigSlots(config: VehicleConfig): NormalizedVehicleSlot[] {
  const truppSlots =
    config.trupps?.flatMap((trupp) => normalizeVehicleTrupp(trupp).slots) ?? [];
  const standaloneSlots = (config.slots ?? []).map(normalizeVehicleSlot);
  return [...truppSlots, ...standaloneSlots];
}
