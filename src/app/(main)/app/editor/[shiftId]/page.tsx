"use client"

import { DndProvider } from "@/components/editor/dnd-provider";
import { PersonPool } from "@/components/editor/person-pool";
import { VehicleCard } from "@/components/editor/vehicle-card";
import { assignPersonToSlot } from "@/lib/actions/editor.actions";
import { createClient } from "@/lib/supabase/client";
import { Database, VehicleConfig } from "@/types";
import { DragEndEvent } from "@dnd-kit/core";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner"; // Using sonner for toasts, should be added to the layout

type ShiftData = Database['public']['Tables']['shifts']['Row'] & { station: { name: string }, division: { name: string }};
type PersonData = Database['public']['Tables']['people']['Row'];
type VehicleData = Database['public']['Tables']['vehicle_configs']['Row'];
type AssignmentData = Database['public']['Tables']['assignments']['Row'] & { people: PersonData | null };

interface EditorPageProps {
    params: { shiftId: string };
}

type AssignmentsMap = Map<string, PersonData | null>;

export default function ShiftEditorPage({ params }: EditorPageProps) {
    const { shiftId } = params;
    const supabase = createClient();
    const [isPending, startTransition] = useTransition();

    const [shift, setShift] = useState<ShiftData | null>(null);
    const [people, setPeople] = useState<PersonData[]>([]);
    const [vehicles, setVehicles] = useState<VehicleData[]>([]);
    const [assignments, setAssignments] = useState<AssignmentsMap>(new Map());
    const [peopleMap, setPeopleMap] = useState<Map<string, PersonData>>(new Map());

    useEffect(() => {
        const fetchData = async () => {
            const { data: shiftData, error: shiftError } = await supabase
                .from('shifts')
                .select(`*, station:stations(name), division:divisions(name)`)
                .eq('id', shiftId)
                .single();
            
            if (shiftError || !shiftData) return console.error("Error fetching shift", shiftError);
            setShift(shiftData as ShiftData);

            const { data: peopleData, error: peopleError } = await supabase
                .from('people')
                .select('*')
                .eq('station_id', shiftData.station_id);

            if (peopleError) return console.error("Error fetching people", peopleError);
            setPeople(peopleData);
            setPeopleMap(new Map(peopleData.map(p => [p.id, p])));

            const { data: vehicleData, error: vehicleError } = await supabase
                .from('vehicle_configs')
                .select('*')
                .eq('station_id', shiftData.station_id)
                .order('order', { ascending: true });
            
            if (vehicleError) return console.error("Error fetching vehicles", vehicleError);
            setVehicles(vehicleData);

            const { data: assignmentData, error: assignmentError } = await supabase
                .from('assignments')
                .select(`*, people(*)`)
                .eq('shift_id', shiftId);

            if (assignmentError) return console.error("Error fetching assignments", assignmentError);

            const newAssignmentsMap: AssignmentsMap = new Map();
            for (const a of assignmentData) {
                const mapKey = `${a.vehicle_key}-${a.slot_key}`;
                newAssignmentsMap.set(mapKey, a.people);
            }
            setAssignments(newAssignmentsMap);
        };

        fetchData();
    }, [shiftId, supabase]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        // If dropped outside a valid target
        if (!over) {
            // Handle un-assignment if dragged from a slot
            const fromSlotId = active.data.current?.fromSlot;
            if (fromSlotId) {
                const newAssignments = new Map(assignments);
                newAssignments.set(fromSlotId, null);
                setAssignments(newAssignments);
                
                const { vehicleKey, slotKey } = parseSlotId(fromSlotId);
                startTransition(async () => {
                    const result = await assignPersonToSlot({ shiftId, vehicleKey, slotKey, personId: null });
                    if (!result.success) {
                        toast.error(result.message);
                        // Revert will be handled by a re-fetch or more complex state management
                    }
                });
            }
            return;
        }
        
        const person = active.data.current?.person as PersonData;
        const fromSlotId = active.data.current?.fromSlot; // Where the person came from, if any
        const toSlotId = over.id as string; // Where the person is going

        if (!person || toSlotId === fromSlotId) return;

        // Optimistic Update
        const newAssignments = new Map(assignments);
        if (fromSlotId) {
            newAssignments.set(fromSlotId, null); // Vacate the old slot
        }
        newAssignments.set(toSlotId, person); // Occupy the new slot
        setAssignments(newAssignments);

        // Server Action
        const { vehicleKey, slotKey } = parseSlotId(toSlotId);
        startTransition(async () => {
            const result = await assignPersonToSlot({
                shiftId,
                vehicleKey,
                slotKey,
                personId: person.id,
            });

            if (!result.success) {
                toast.error(result.message);
                // Revert optimistic update by rolling back state
                const revertedAssignments = new Map(assignments);
                setAssignments(revertedAssignments);
            }
        });
    };
    
    const assignedPersonIds = new Set(Array.from(assignments.values()).filter(Boolean).map(p => p!.id));

    if (!shift) {
        return <div className="container py-8 text-center">Lade Schichtdaten...</div>
    }

    return (
        <DndProvider onDragEnd={handleDragEnd}>
            <div className="container mx-auto py-4 h-[calc(100vh-80px)]">
                 <div className="mb-4">
                    <h1 className="text-2xl font-bold">{shift.station.name} - {shift.division.name}</h1>
                    <p className="text-muted-foreground">
                        {new Date(shift.starts_at).toLocaleString('de-DE')} - {new Date(shift.ends_at).toLocaleString('de-DE')} ({shift.label})
                    </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                    <div className="lg:col-span-1 h-full">
                        <PersonPool people={people} assignedPersonIds={assignedPersonIds} />
                    </div>
                    <div className="lg:col-span-3 space-y-4 h-full overflow-y-auto pb-8">
                        {vehicles.map(vehicle => (
                            <VehicleCard 
                                key={vehicle.key}
                                vehicle={{...vehicle, config: vehicle.config as VehicleConfig }}
                                assignments={assignments}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </DndProvider>
    )
}

function parseSlotId(id: string) {
    const parts = id.split('-');
    const slotKey = parts.pop()!;
    const vehicleKey = parts.join('-');
    return { vehicleKey, slotKey };
}

