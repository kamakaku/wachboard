"use client"

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database, VehicleConfig } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { flattenVehicleConfigSlots } from "@/lib/vehicle-config";
import Image from "next/image";

type Shift = Database['public']['Tables']['shifts']['Row'] & {
    division: Database['public']['Tables']['divisions']['Row'];
    assignments: (Database['public']['Tables']['assignments']['Row'] & {
        people: Database['public']['Tables']['people']['Row'] | null;
    })[];
};

type Vehicle = Database['public']['Tables']['vehicle_configs']['Row'];

export default function DisplayPage({ params }: { params: { stationId: string } }) {
    const { stationId } = params;
    const supabase = createClient();

    const [shifts, setShifts] = useState<Shift[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [stationName, setStationName] = useState('');
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Update time every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: stationData } = await supabase.from('stations').select('name').eq('id', stationId).single();
            if (stationData) setStationName(stationData.name);

            const { data: vehicleData } = await supabase.from('vehicle_configs').select('*').eq('station_id', stationId).order('order');
            if (vehicleData) setVehicles(vehicleData);
            
            const { data: shiftData, error } = await supabase
                .from('shifts')
                .select(`*, division:divisions(*), assignments:assignments(*, people:people(*))`)
                .eq('station_id', stationId)
                .gt('ends_at', new Date().toISOString())
                .order('starts_at', { ascending: true })
                .limit(3); // Current, next, next2
            
            if (error) console.error("Error fetching shifts:", error);
            else if (shiftData) setShifts(shiftData as Shift[]);
        };

        fetchInitialData();

        const channel = supabase
            .channel(`realtime:shifts:${stationId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, (payload) => {
                console.log('Change received!', payload);
                fetchInitialData(); // Re-fetch all data on change for simplicity
            })
             .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, (payload) => {
                console.log('Change received!', payload);
                fetchInitialData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [stationId, supabase]);

    const currentShifts = shifts.filter(s => new Date(s.starts_at) <= now && new Date(s.ends_at) > now);
    const upcomingShifts = shifts.filter(s => new Date(s.starts_at) > now);

    return (
        <div className="bg-gray-900 text-white min-h-screen p-8 font-sans">
            <div className="text-center mb-8">
                <h1 className="text-5xl font-bold">{stationName || 'Lade...'}</h1>
                <p className="text-2xl text-gray-400">{now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {shifts.slice(0, 3).map((shift, index) => (
                    <div key={shift.id} className="bg-gray-800 p-6 rounded-lg">
                        <div className="mb-4">
                            <h2 className="text-3xl font-bold">{shift.division.name} ({shift.label})</h2>
                             <p className="text-xl text-gray-300">
                                {new Date(shift.starts_at).toLocaleTimeString('de-DE')} - {new Date(shift.ends_at).toLocaleTimeString('de-DE')}
                            </p>
                            {index === 0 && <Badge variant="secondary" className="mt-2">Aktueller Dienst</Badge>}
                            {index === 1 && <Badge variant="outline" className="mt-2">Nächster Dienst</Badge>}
                        </div>
                        <div className="space-y-4">
                            {vehicles.map(vehicle => (
                                <VehicleDisplay key={vehicle.key} vehicle={vehicle} shift={shift} />
                            ))}
                        </div>
                    </div>
                ))}
                 {shifts.length === 0 && <p className="text-center col-span-3 text-2xl">Keine Dienste für die Anzeige geplant.</p>}
            </div>
        </div>
    );
}

function VehicleDisplay({ vehicle, shift }: { vehicle: Vehicle, shift: Shift }) {
    const config = vehicle.config as VehicleConfig;
    const assignments = shift.assignments;
    const normalizedSlots = flattenVehicleConfigSlots(config);
    
    return (
        <Card className="bg-gray-700 border-gray-600">
            <CardHeader>
                <CardTitle className="text-2xl">{vehicle.title}</CardTitle>
            </CardHeader>
            <CardContent>
                {vehicle.image_url && (
                    <div className="mb-4 h-40 w-full overflow-hidden rounded border border-gray-500">
                        <Image
                            src={vehicle.image_url}
                            alt={vehicle.title}
                            width={600}
                            height={240}
                            className="h-full w-full object-cover"
                        />
                    </div>
                )}
                 <div className="grid grid-cols-2 gap-4">
                    {normalizedSlots.map(slot => {
                        const assignment = assignments.find(a => a.vehicle_key === vehicle.key && a.slot_key === slot.key);
                        const person = assignment?.people ?? null;
                        return (
                            <div key={slot.key} className="bg-gray-800 p-2 rounded">
                                <p className="text-sm text-gray-400">{slot.label}</p>
                                {slot.description && (
                                    <p className="text-xs text-gray-500 mb-1">{slot.description}</p>
                                )}
                                <div className="flex items-center gap-3">
                                    <Avatar src={person?.photo_url ?? undefined} name={person?.name ?? undefined} size={40} />
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="font-semibold truncate">
                                            {person?.name ?? "---"}
                                        </p>
                                        {person?.rank && (
                                            <p className="text-xs text-gray-400 truncate">
                                                {person.rank}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
