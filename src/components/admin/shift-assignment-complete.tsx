"use client"

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, GripVertical, Users, Stethoscope, ShieldAlert, Copy } from "lucide-react";

type Person = {
  id: string;
  name: string;
  rank?: string;
  tags?: string[];
  photo_url?: string;
  person_type?: 'MITARBEITER' | 'NOTARZT' | 'FUEHRUNGSDIENST';
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
    allowsPraktikant?: boolean;
    hasNotarztPool?: boolean;
    hasFuehrungsdienstPool?: boolean;
  };
};

type ShiftAssignmentProps = {
  vehicles: Vehicle[];
  people: Person[];
};

export function ShiftAssignmentComplete({ vehicles, people }: ShiftAssignmentProps) {
  // Filter people by type
  const mitarbeiter = people.filter(p => !p.person_type || p.person_type === 'MITARBEITER');
  const notarzte = people.filter(p => p.person_type === 'NOTARZT');
  const fuehrungsdienst = people.filter(p => p.person_type === 'FUEHRUNGSDIENST');

  // Assignments - allow multiple vehicles per person
  const [assignments, setAssignments] = useState<{
    [vehicleId: string]: {
      [slotKey: string]: string | null;
    };
  }>({});

  // Copied trupps - trupps from other vehicles
  const [copiedTrupps, setCopiedTrupps] = useState<{
    [vehicleId: string]: Array<{
      sourceVehicleId: string;
      sourceTruppKey: string;
      targetTruppKey: string;
    }>;
  }>({});

  // Praktikant flags per vehicle
  const [praktikantFlags, setPraktikantFlags] = useState<{
    [vehicleId: string]: boolean;
  }>({});

  // Drag state
  const [draggedPerson, setDraggedPerson] = useState<Person | null>(null);
  const [draggedTrupp, setDraggedTrupp] = useState<{
    vehicleId: string;
    truppKey: string;
  } | null>(null);

  // Active tab
  const [activePersonTab, setActivePersonTab] = useState<string>('mitarbeiter');

  // Person assignment - allow multi-vehicle
  const assignPerson = (vehicleId: string, slotKey: string, personId: string | null) => {
    setAssignments(prev => ({
      ...prev,
      [vehicleId]: {
        ...prev[vehicleId],
        [slotKey]: personId,
      },
    }));
  };

  const getAssignedPerson = (vehicleId: string, slotKey: string): Person | null => {
    const personId = assignments[vehicleId]?.[slotKey];
    if (!personId) return null;
    return people.find(p => p.id === personId) || null;
  };

  const canPersonBeAssigned = (personId: string, vehicle: Vehicle, slotKey: string): boolean => {
    const person = people.find(p => p.id === personId);
    if (!person) return false;

    // Special slots have specific requirements
    if (slotKey === '__notarzt__') {
      return person.person_type === 'NOTARZT';
    }
    if (slotKey === '__fuehrungsdienst__') {
      return person.person_type === 'FUEHRUNGSDIENST';
    }

    // Regular slots can only accept MITARBEITER (not special types)
    // This prevents Notarzt/Führungsdienst from being assigned to regular positions
    return !person.person_type || person.person_type === 'MITARBEITER';
  };

  const getPersonsByTab = (tab: string): Person[] => {
    switch (tab) {
      case 'notarzt':
        return notarzte;
      case 'fuehrungsdienst':
        return fuehrungsdienst;
      default:
        return mitarbeiter;
    }
  };

  // Trupp copying
  const copyTruppToVehicle = (
    targetVehicleId: string,
    sourceVehicleId: string,
    sourceTruppKey: string
  ) => {
    const sourceVehicle = vehicles.find(v => v.id === sourceVehicleId);
    if (!sourceVehicle) return;

    const targetVehicle = vehicles.find(v => v.id === targetVehicleId);
    if (!targetVehicle) return;

    // Find next available trupp name
    const existingTrupps = targetVehicle.config.trupps || [];
    let targetTruppKey = sourceTruppKey;
    let counter = 2;
    while (existingTrupps.some(t => t.key === targetTruppKey)) {
      targetTruppKey = `${sourceTruppKey} (${counter})`;
      counter++;
    }

    setCopiedTrupps(prev => ({
      ...prev,
      [targetVehicleId]: [
        ...(prev[targetVehicleId] || []),
        {
          sourceVehicleId,
          sourceTruppKey,
          targetTruppKey,
        },
      ],
    }));
  };

  const removeCopiedTrupp = (vehicleId: string, index: number) => {
    setCopiedTrupps(prev => ({
      ...prev,
      [vehicleId]: (prev[vehicleId] || []).filter((_, i) => i !== index),
    }));
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, person: Person) => {
    setDraggedPerson(person);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleTruppDragStart = (e: React.DragEvent, vehicleId: string, truppKey: string) => {
    setDraggedTrupp({ vehicleId, truppKey });
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDropOnSlot = (e: React.DragEvent, vehicleId: string, slotKey: string) => {
    e.preventDefault();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (draggedPerson && vehicle && canPersonBeAssigned(draggedPerson.id, vehicle, slotKey)) {
      assignPerson(vehicleId, slotKey, draggedPerson.id);
    }
    setDraggedPerson(null);
  };

  const handleDropOnVehicle = (e: React.DragEvent, targetVehicleId: string) => {
    e.preventDefault();
    if (draggedTrupp && draggedTrupp.vehicleId !== targetVehicleId) {
      copyTruppToVehicle(targetVehicleId, draggedTrupp.vehicleId, draggedTrupp.truppKey);
    }
    setDraggedTrupp(null);
  };

  return (
    <div className="space-y-6">
      {/* Vehicle Assignment */}
      <div className="grid grid-cols-12 gap-6">
        {/* Person Pool Sidebar with Tabs */}
        <div className="col-span-3">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personalpool</CardTitle>
              <CardDescription className="text-xs">
                Personen auf Positionen ziehen
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activePersonTab} onValueChange={setActivePersonTab}>
                <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
                  <TabsTrigger value="mitarbeiter" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {mitarbeiter.length}
                  </TabsTrigger>
                  <TabsTrigger value="notarzt" className="text-xs">
                    <Stethoscope className="h-3 w-3 mr-1" />
                    {notarzte.length}
                  </TabsTrigger>
                  <TabsTrigger value="fuehrungsdienst" className="text-xs">
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    {fuehrungsdienst.length}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activePersonTab} className="mt-0 p-3">
                  <div className="space-y-1 max-h-[65vh] overflow-y-auto">
                    {getPersonsByTab(activePersonTab).map((person) => (
                      <div
                        key={person.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, person)}
                        className="flex items-center gap-2 p-1.5 rounded border cursor-move hover:bg-muted/50 text-xs"
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <Avatar src={person.photo_url ?? undefined} name={person.name} size={20} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate leading-tight">{person.name}</p>
                          {person.rank && (
                            <p className="text-[10px] text-muted-foreground leading-tight">{person.rank}</p>
                          )}
                        </div>
                        {person.tags && person.tags.length > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1 h-4">
                            {person.tags[0]}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Vehicles */}
        <div className="col-span-9 space-y-6">
          {vehicles.map((vehicle) => (
            <Card
              key={vehicle.id}
              className="border-2"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnVehicle(e, vehicle.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
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
                  <div className="flex items-center gap-4">
                    {vehicle.config.hasNotarztPool && (
                      <Badge variant="outline" className="bg-red-50">
                        <Stethoscope className="h-3 w-3 mr-1" />
                        Notarzt
                      </Badge>
                    )}
                    {vehicle.config.hasFuehrungsdienstPool && (
                      <Badge variant="outline" className="bg-blue-50">
                        <ShieldAlert className="h-3 w-3 mr-1" />
                        Führung
                      </Badge>
                    )}
                    {vehicle.config.allowsPraktikant && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`praktikant-${vehicle.id}`}
                          checked={praktikantFlags[vehicle.id] || false}
                          onCheckedChange={(checked) =>
                            setPraktikantFlags(prev => ({ ...prev, [vehicle.id]: checked === true }))
                          }
                        />
                        <Label htmlFor={`praktikant-${vehicle.id}`} className="text-sm cursor-pointer">
                          Praktikant mitfahrend
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Special Pool Slots */}
                {(vehicle.config.hasNotarztPool || vehicle.config.hasFuehrungsdienstPool) && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Spezial-Positionen</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {vehicle.config.hasNotarztPool && (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Stethoscope className="h-3 w-3 text-red-600" />
                            Notarzt
                          </label>
                          <div
                            className="min-h-[3rem] p-2 rounded border-2 border-dashed bg-red-50/50"
                            onDragOver={handleDragOver}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedPerson && draggedPerson.person_type === 'NOTARZT') {
                                assignPerson(vehicle.id, '__notarzt__', draggedPerson.id);
                              }
                              setDraggedPerson(null);
                            }}
                          >
                            {(() => {
                              const assignedPerson = getAssignedPerson(vehicle.id, '__notarzt__');
                              return assignedPerson ? (
                                <div className="flex items-center gap-2">
                                  <Avatar
                                    src={assignedPerson.photo_url ?? undefined}
                                    name={assignedPerson.name}
                                    size={24}
                                  />
                                  <span className="text-xs font-medium flex-1 truncate">
                                    {assignedPerson.name}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => assignPerson(vehicle.id, '__notarzt__', null)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground text-center py-2">
                                  Notarzt ziehen
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {vehicle.config.hasFuehrungsdienstPool && (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3 text-blue-600" />
                            Führungsdienst
                          </label>
                          <div
                            className="min-h-[3rem] p-2 rounded border-2 border-dashed bg-blue-50/50"
                            onDragOver={handleDragOver}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedPerson && draggedPerson.person_type === 'FUEHRUNGSDIENST') {
                                assignPerson(vehicle.id, '__fuehrungsdienst__', draggedPerson.id);
                              }
                              setDraggedPerson(null);
                            }}
                          >
                            {(() => {
                              const assignedPerson = getAssignedPerson(vehicle.id, '__fuehrungsdienst__');
                              return assignedPerson ? (
                                <div className="flex items-center gap-2">
                                  <Avatar
                                    src={assignedPerson.photo_url ?? undefined}
                                    name={assignedPerson.name}
                                    size={24}
                                  />
                                  <span className="text-xs font-medium flex-1 truncate">
                                    {assignedPerson.name}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => assignPerson(vehicle.id, '__fuehrungsdienst__', null)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground text-center py-2">
                                  Führungsdienst ziehen
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Copied Trupps */}
                {copiedTrupps[vehicle.id] && copiedTrupps[vehicle.id].length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Kopierte Trupps
                    </h4>
                    {copiedTrupps[vehicle.id].map((copied, idx) => {
                      const sourceVehicle = vehicles.find(v => v.id === copied.sourceVehicleId);
                      const sourceTrupp = sourceVehicle?.config.trupps?.find(t => t.key === copied.sourceTruppKey);

                      return (
                        <div key={idx} className="border rounded-lg p-3 bg-green-50">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium">{copied.targetTruppKey}</p>
                              <p className="text-xs text-muted-foreground">
                                Von {sourceVehicle?.title} - {copied.sourceTruppKey}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCopiedTrupp(vehicle.id, idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {sourceTrupp && (
                            <div className="grid grid-cols-2 gap-2">
                              {sourceTrupp.slots.map((slotName, slotIdx) => {
                                // Get assignment from SOURCE vehicle
                                const sourceSlotKey = `${copied.sourceTruppKey}:${slotName}`;
                                const assignedPerson = getAssignedPerson(copied.sourceVehicleId, sourceSlotKey);

                                return (
                                  <div
                                    key={slotIdx}
                                    className="space-y-1"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => {
                                      // Assign to copied trupp on current vehicle
                                      const targetSlotKey = `${copied.targetTruppKey}:${slotName}`;
                                      handleDropOnSlot(e, vehicle.id, targetSlotKey);
                                    }}
                                  >
                                    <label className="text-[10px] text-muted-foreground">{slotName}</label>
                                    <div
                                      className={`min-h-[2.5rem] p-1.5 rounded border-2 border-dashed ${
                                        assignedPerson
                                          ? "bg-white border-primary"
                                          : "bg-white border-muted-foreground/20"
                                      }`}
                                    >
                                      {assignedPerson ? (
                                        <div className="flex items-center gap-1">
                                          <Avatar
                                            src={assignedPerson.photo_url ?? undefined}
                                            name={assignedPerson.name}
                                            size={20}
                                          />
                                          <span className="text-[11px] font-medium flex-1 truncate">
                                            {assignedPerson.name}
                                          </span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => assignPerson(copied.sourceVehicleId, sourceSlotKey, null)}
                                            className="h-5 w-5 p-0"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center h-full relative">
                                          <span className="text-[10px] text-muted-foreground">Ziehen</span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              // Mark slot as hidden/removed for this shift
                                              assignPerson(copied.sourceVehicleId, sourceSlotKey, null);
                                            }}
                                            className="h-4 w-4 p-0 absolute top-0 right-0"
                                            title="Slot für diesen Dienstplan ausblenden"
                                          >
                                            <X className="h-2.5 w-2.5 text-muted-foreground/50 hover:text-destructive" />
                                          </Button>
                                        </div>
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

                {/* Original Trupps */}
                {vehicle.config.trupps && vehicle.config.trupps.length > 0 && (
                  <div className="space-y-3">
                    {vehicle.config.trupps.map((trupp) => (
                      <div
                        key={trupp.key}
                        className="border rounded-lg p-4 bg-muted/30"
                      >
                        <div
                          className="flex items-center gap-2 mb-3 cursor-move select-none"
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleTruppDragStart(e, vehicle.id, trupp.key);
                          }}
                        >
                          <GripVertical
                            className="h-4 w-4 text-muted-foreground"
                          />
                          <h4 className="font-semibold text-sm">{trupp.key}</h4>
                          {trupp.allowsPraktikant && (
                            <Badge variant="outline" className="text-xs">+Praktikant</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {trupp.slots.map((slotName) => {
                            const slotKey = `${trupp.key}:${slotName}`;
                            const assignedPerson = getAssignedPerson(vehicle.id, slotKey);

                            return (
                              <div
                                key={slotKey}
                                className="space-y-1"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropOnSlot(e, vehicle.id, slotKey)}
                              >
                                <label className="text-xs text-muted-foreground">{slotName}</label>
                                <div
                                  className={`min-h-[3rem] p-2 rounded border-2 border-dashed ${
                                    assignedPerson
                                      ? "bg-primary/5 border-primary"
                                      : "border-muted-foreground/20"
                                  }`}
                                >
                                  {assignedPerson ? (
                                    <div className="flex items-center gap-2">
                                      <Avatar
                                        src={assignedPerson.photo_url ?? undefined}
                                        name={assignedPerson.name}
                                        size={24}
                                      />
                                      <span className="text-xs font-medium flex-1 truncate">
                                        {assignedPerson.name}
                                      </span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => assignPerson(vehicle.id, slotKey, null)}
                                        className="h-6 w-6 p-0"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center h-full relative py-2">
                                      <span className="text-xs text-muted-foreground">Person ziehen</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => assignPerson(vehicle.id, slotKey, null)}
                                        className="h-5 w-5 p-0 absolute top-1 right-1"
                                        title="Slot für diesen Dienstplan ausblenden"
                                      >
                                        <X className="h-3 w-3 text-muted-foreground/50 hover:text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
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
                          <div
                            key={slotKey}
                            className="space-y-1"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnSlot(e, vehicle.id, slotKey)}
                          >
                            <label className="text-xs text-muted-foreground">{slotName}</label>
                            <div
                              className={`min-h-[3rem] p-2 rounded border-2 border-dashed ${
                                assignedPerson
                                  ? "bg-primary/5 border-primary"
                                  : "border-muted-foreground/20"
                              }`}
                            >
                              {assignedPerson ? (
                                <div className="flex items-center gap-2">
                                  <Avatar
                                    src={assignedPerson.photo_url ?? undefined}
                                    name={assignedPerson.name}
                                    size={24}
                                  />
                                  <span className="text-xs font-medium flex-1 truncate">
                                    {assignedPerson.name}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => assignPerson(vehicle.id, slotKey, null)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full relative">
                                  <span className="text-xs text-muted-foreground">Person ziehen</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => assignPerson(vehicle.id, slotKey, null)}
                                    className="h-5 w-5 p-0 absolute top-1 right-1"
                                    title="Slot für diesen Dienstplan ausblenden"
                                  >
                                    <X className="h-3 w-3 text-muted-foreground/50 hover:text-destructive" />
                                  </Button>
                                </div>
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
          ))}
        </div>
      </div>

      {/* Hidden inputs */}
      <input type="hidden" name="assignments" value={JSON.stringify(assignments)} />
      <input type="hidden" name="copiedTrupps" value={JSON.stringify(copiedTrupps)} />
      <input type="hidden" name="praktikantFlags" value={JSON.stringify(praktikantFlags)} />
    </div>
  );
}
