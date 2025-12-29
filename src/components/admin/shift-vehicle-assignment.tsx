"use client"

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

type Person = {
  id: string;
  name: string;
  rank?: string;
  tags?: string[];
  photo_url?: string;
};

type Vehicle = {
  id: string;
  key: string;
  title: string;
  image_url?: string;
  config: {
    trupps?: Array<{
      key: string;
      slots: string[];
      allowsPraktikant?: boolean;
    }>;
    slots?: string[];
  };
};

type Assignment = {
  [vehicleId: string]: {
    [slotKey: string]: string | null; // person id or null
  };
};

type TruppAssignment = {
  [vehicleId: string]: {
    [truppKey: string]: string | null; // source vehicle id or null (for cross-vehicle assignment)
  };
};

type ShiftVehicleAssignmentProps = {
  vehicles: Vehicle[];
  people: Person[];
};

export function ShiftVehicleAssignment({ vehicles, people }: ShiftVehicleAssignmentProps) {
  const [assignments, setAssignments] = useState<Assignment>({});
  const [truppAssignments, setTruppAssignments] = useState<TruppAssignment>({});

  const assignPerson = (vehicleId: string, slotKey: string, personId: string | null) => {
    setAssignments((prev) => ({
      ...prev,
      [vehicleId]: {
        ...prev[vehicleId],
        [slotKey]: personId,
      },
    }));
  };

  const assignTrupp = (vehicleId: string, truppKey: string, sourceVehicleId: string | null) => {
    setTruppAssignments((prev) => ({
      ...prev,
      [vehicleId]: {
        ...prev[vehicleId],
        [truppKey]: sourceVehicleId,
      },
    }));
  };

  const getAssignedPerson = (vehicleId: string, slotKey: string): Person | null => {
    const personId = assignments[vehicleId]?.[slotKey];
    if (!personId) return null;
    return people.find((p) => p.id === personId) || null;
  };

  const getAssignedTrupp = (vehicleId: string, truppKey: string): Vehicle | null => {
    const sourceVehicleId = truppAssignments[vehicleId]?.[truppKey];
    if (!sourceVehicleId) return null;
    return vehicles.find((v) => v.id === sourceVehicleId) || null;
  };

  const isPersonAssigned = (personId: string): boolean => {
    return Object.values(assignments).some((vehicleAssignments) =>
      Object.values(vehicleAssignments).includes(personId)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fahrzeugbesetzung</CardTitle>
        <CardDescription>
          Weisen Sie Personal zu Positionen zu oder ordnen Sie komplette Trupps zwischen Fahrzeugen zu
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {vehicles && vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  {vehicle.image_url && (
                    <img
                      src={vehicle.image_url}
                      alt={vehicle.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <CardTitle className="text-lg">{vehicle.title}</CardTitle>
                    <CardDescription>
                      <code className="text-xs">{vehicle.key}</code>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Trupps */}
                {vehicle.config.trupps && vehicle.config.trupps.length > 0 && (
                  <div className="space-y-3">
                    {vehicle.config.trupps.map((trupp) => {
                      const assignedSourceVehicle = getAssignedTrupp(vehicle.id, trupp.key);

                      return (
                        <div key={trupp.key} className="border rounded-lg p-4 bg-muted/30">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm">{trupp.key}</h4>
                              {trupp.allowsPraktikant && (
                                <Badge variant="outline" className="text-xs">
                                  +Praktikant
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={assignedSourceVehicle?.id || "__none__"}
                                onValueChange={(value) => assignTrupp(vehicle.id, trupp.key, value === "__none__" ? null : value)}
                              >
                                <SelectTrigger className="w-[200px] h-8 text-xs">
                                  <SelectValue placeholder="Trupp von anderem Fahrzeug..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Keine Zuweisung</SelectItem>
                                  {vehicles
                                    .filter((v) => v.id !== vehicle.id)
                                    .map((v) => (
                                      <SelectItem key={v.id} value={v.id}>
                                        Von {v.title}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              {assignedSourceVehicle && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => assignTrupp(vehicle.id, trupp.key, null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {assignedSourceVehicle ? (
                            <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                              Trupp wird von <strong>{assignedSourceVehicle.title}</strong> übernommen
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {trupp.slots.map((slotName) => {
                                const slotKey = `${trupp.key}:${slotName}`;
                                const assignedPerson = getAssignedPerson(vehicle.id, slotKey);

                                return (
                                  <div key={slotKey} className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      {slotName}
                                    </Label>
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={assignedPerson?.id || "__none__"}
                                        onValueChange={(value) => assignPerson(vehicle.id, slotKey, value === "__none__" ? null : value)}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Person wählen..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__none__">Nicht besetzt</SelectItem>
                                          {people.map((person) => (
                                            <SelectItem
                                              key={person.id}
                                              value={person.id}
                                              disabled={isPersonAssigned(person.id) && assignedPerson?.id !== person.id}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span>{person.name}</span>
                                                {person.rank && (
                                                  <span className="text-xs text-muted-foreground">
                                                    ({person.rank})
                                                  </span>
                                                )}
                                                {isPersonAssigned(person.id) && assignedPerson?.id !== person.id && (
                                                  <Badge variant="secondary" className="text-xs">
                                                    Bereits zugewiesen
                                                  </Badge>
                                                )}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {assignedPerson && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => assignPerson(vehicle.id, slotKey, null)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Einzelne Slots */}
                {vehicle.config.slots && vehicle.config.slots.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Einzelne Positionen</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {vehicle.config.slots.map((slotName) => {
                        const slotKey = slotName;
                        const assignedPerson = getAssignedPerson(vehicle.id, slotKey);

                        return (
                          <div key={slotKey} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              {slotName}
                            </Label>
                            <div className="flex items-center gap-2">
                              <Select
                                value={assignedPerson?.id || "__none__"}
                                onValueChange={(value) => assignPerson(vehicle.id, slotKey, value === "__none__" ? null : value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Person wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Nicht besetzt</SelectItem>
                                  {people.map((person) => (
                                    <SelectItem
                                      key={person.id}
                                      value={person.id}
                                      disabled={isPersonAssigned(person.id) && assignedPerson?.id !== person.id}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>{person.name}</span>
                                        {person.rank && (
                                          <span className="text-xs text-muted-foreground">
                                            ({person.rank})
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {assignedPerson && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => assignPerson(vehicle.id, slotKey, null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Keine Fahrzeuge konfiguriert. Bitte erstellen Sie zuerst Fahrzeuge.
          </p>
        )}

        {/* Hidden inputs for form submission */}
        <input type="hidden" name="assignments" value={JSON.stringify(assignments)} />
        <input type="hidden" name="truppAssignments" value={JSON.stringify(truppAssignments)} />
      </CardContent>
    </Card>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
