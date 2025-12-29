import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { DroppableSlot } from "./droppable-slot";
import type { VehicleConfig, people as TPeople } from "@/types";
import {
  normalizeVehicleSlot,
  normalizeVehicleTrupp,
  type NormalizedVehicleSlot,
} from "@/lib/vehicle-config";

type Person = TPeople["Row"];
type AssignmentsMap = Map<string, Person | null>;

export function VehicleCard({
  vehicle,
  assignments,
}: {
  vehicle: { key: string; title: string; config: VehicleConfig };
  assignments: AssignmentsMap;
}) {
  const config = vehicle.config;

  const renderSlot = (slot: NormalizedVehicleSlot, vehicleKey: string) => {
    const assignmentKey = `${vehicleKey}-${slot.key}`;
    const person = assignments.get(assignmentKey) ?? null;

    return (
      <DroppableSlot
        key={assignmentKey}
        id={assignmentKey}
        slotName={slot.label}
        slotDescription={slot.description}
        person={person}
        data={{ type: "slot", data: { vehicleKey, slotKey: slot.key } }}
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{vehicle.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.trupps &&
          config.trupps.map((trupp) => {
            const normalizedTrupp = normalizeVehicleTrupp(trupp);
            return (
              <div
                key={normalizedTrupp.key}
                className="p-3 border rounded-md bg-muted/20"
              >
                <h4 className="font-semibold mb-1">{normalizedTrupp.label}</h4>
                {normalizedTrupp.description && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {normalizedTrupp.description}
                  </p>
                )}
                <div className="space-y-2">
                  {normalizedTrupp.slots.map((slot) =>
                    renderSlot(slot, vehicle.key)
                  )}
                </div>
              </div>
            );
          })}
        {config.slots && (
          <div className="space-y-2">
            {config.slots.map((slot) =>
              renderSlot(normalizeVehicleSlot(slot), vehicle.key)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
