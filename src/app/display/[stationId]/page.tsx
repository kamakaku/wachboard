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
    const [stationCrestUrl, setStationCrestUrl] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => setNow(new Date()), 1000); // Update time every second
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: stationData } = await supabase.from('stations').select('name, crest_url').eq('id', stationId).single<{ name: string; crest_url: string | null }>();
            if (stationData) {
                setStationName(stationData.name);
                setStationCrestUrl(stationData.crest_url);
            }

            const { data: vehicleData } = await supabase.from('vehicle_configs').select('*').eq('station_id', stationId).order('order');
            if (vehicleData) setVehicles(vehicleData);

            const { data: shiftData, error } = await supabase
                .from('shifts')
                .select(`*, division:divisions(*), assignments:assignments(*, people:people(*))`)
                .eq('station_id', stationId)
                .gt('ends_at', new Date().toISOString())
                .order('starts_at', { ascending: true })
                .limit(2); // Current and next

            if (error) console.error("Error fetching shifts:", error);
            else if (shiftData) {
                console.log('Fetched shifts count:', shiftData.length);
                console.log('Fetched shifts details:', (shiftData as any).map((s: any) => ({
                    id: s.id,
                    division: s.division?.name,
                    starts_at: s.starts_at,
                    ends_at: s.ends_at
                })));
                console.log('Current time:', new Date().toISOString());
                setShifts(shiftData as Shift[]);
            }
        };

        fetchInitialData();

        // Reload shifts every 30 seconds to update when shifts start/end
        const reloadInterval = setInterval(() => {
            fetchInitialData();
        }, 30000);

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
            clearInterval(reloadInterval);
            supabase.removeChannel(channel);
        };
    }, [stationId, supabase]);

    const currentShift = shifts.find(s => new Date(s.starts_at) <= now && new Date(s.ends_at) > now);
    const nextShift = shifts.find(s => new Date(s.starts_at) > now);

    // Debug logs
    if (shifts.length > 0 && mounted) {
        console.log('Now:', now.toISOString());
        console.log('Shifts:', shifts.map(s => ({
            id: s.id,
            division: s.division.name,
            starts_at: s.starts_at,
            ends_at: s.ends_at,
            isCurrent: new Date(s.starts_at) <= now && new Date(s.ends_at) > now,
            isNext: new Date(s.starts_at) > now,
            startsInPast: new Date(s.starts_at) <= now,
            endsInFuture: new Date(s.ends_at) > now
        })));
        console.log('Current shift:', currentShift ? `${currentShift.division.name} (${currentShift.starts_at} - ${currentShift.ends_at})` : 'none');
        console.log('Next shift:', nextShift ? `${nextShift.division.name} (${nextShift.starts_at} - ${nextShift.ends_at})` : 'none');
    }

    return (
        <div className="bg-white h-screen overflow-hidden flex flex-col p-2 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 flex-shrink-0 border-b border-gray-300 pb-1">
                <div className="flex items-center gap-3">
                    {stationCrestUrl && (
                        <Image
                            src={stationCrestUrl}
                            alt={`${stationName} Wappen`}
                            width={60}
                            height={60}
                            className="object-contain"
                        />
                    )}
                    <h1 className="text-xl font-bold text-gray-900">{stationName || 'Lade...'}</h1>
                </div>
                <div className="text-right">
                    {mounted ? (
                        <>
                            <p className="text-lg font-bold text-gray-900 tabular-nums">
                                {now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} Uhr
                            </p>
                            <p className="text-[10px] text-gray-600">
                                {now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        </>
                    ) : (
                        <div className="h-8" />
                    )}
                </div>
            </div>

            {/* Two-column layout: Current (left) and Next (right) */}
            <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden min-h-0">
                {/* Current Shift - LEFT */}
                {currentShift ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-1.5 rounded flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Badge className="bg-white text-green-700 font-bold text-[9px] px-1.5 py-0.5">
                                        AKTUELL
                                    </Badge>
                                    <h2 className="text-base font-bold">{currentShift.division.name}</h2>
                                    <p className="text-[10px] opacity-90">
                                        {currentShift.starts_at.split('T')[1].slice(0, 5)} - {currentShift.ends_at.split('T')[1].slice(0, 5)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(currentShift as any).wachleitung_im_haus && (
                                        <Badge className="bg-yellow-400 text-yellow-900 font-bold text-xs px-2 py-0.5">
                                            WL im Haus
                                        </Badge>
                                    )}
                                    {/* Day/Night Icon */}
                                    {(() => {
                                        const startHour = parseInt(currentShift.starts_at.split('T')[1].slice(0, 2));
                                        const isDay = startHour >= 7 && startHour < 19;
                                        return isDay ? (
                                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                            </svg>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-5 mt-1 overflow-y-auto">
                            {vehicles.map(vehicle => (
                                <VehicleDisplay key={vehicle.key} vehicle={vehicle} shift={currentShift} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center">
                        <Card className="border-2 border-gray-300 bg-gray-50">
                            <CardContent className="p-12 text-center">
                                <p className="text-3xl text-gray-500 font-semibold">Keine aktuelle Schicht</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Next Shift - RIGHT */}
                {nextShift ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-1.5 rounded flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Badge className="bg-white text-blue-700 font-bold text-[9px] px-1.5 py-0.5">
                                        NÄCHSTE
                                    </Badge>
                                    <h2 className="text-base font-bold">{nextShift.division.name}</h2>
                                    <p className="text-[10px] opacity-90">
                                        {nextShift.starts_at.split('T')[1].slice(0, 5)} - {nextShift.ends_at.split('T')[1].slice(0, 5)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(nextShift as any).wachleitung_im_haus && (
                                        <Badge className="bg-yellow-400 text-yellow-900 font-bold text-xs px-2 py-0.5">
                                            WL im Haus
                                        </Badge>
                                    )}
                                    {/* Day/Night Icon */}
                                    {(() => {
                                        const startHour = parseInt(nextShift.starts_at.split('T')[1].slice(0, 2));
                                        const isDay = startHour >= 7 && startHour < 19;
                                        return isDay ? (
                                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                            </svg>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-5 mt-1 overflow-y-auto">
                            {vehicles.map(vehicle => (
                                <VehicleDisplay key={vehicle.key} vehicle={vehicle} shift={nextShift} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center">
                        <Card className="border-2 border-gray-300 bg-gray-50">
                            <CardContent className="p-12 text-center">
                                <p className="text-3xl text-gray-500 font-semibold">Keine nächste Schicht geplant</p>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

function VehicleDisplay({ vehicle, shift }: { vehicle: Vehicle, shift: Shift }) {
    const config = vehicle.config as VehicleConfig;
    const assignments = shift.assignments;

    // Group slots by trupp - process assignments directly
    const truppMap = new Map<string, any[]>();
    const individualSlots: any[] = [];

    // Process all assignments for this vehicle
    assignments
        .filter(a => a.vehicle_key === vehicle.key)
        .forEach(assignment => {
            const person = assignment.people ?? null;
            const slotKey = assignment.slot_key;

            // Create a virtual slot for this assignment
            const slot = {
                key: slotKey,
                label: slotKey.includes(':') ? slotKey.split(':')[1] : slotKey
            };

            const isSpecial = slotKey === '__notarzt__' || slotKey === '__fuehrungsdienst__';
            const isTrupp = slotKey.includes('Trupp ') ?? false;
            const truppName = isTrupp && slotKey ? slotKey.split(':')[0] : null;
            const isPraktikant = slot.label?.toLowerCase().includes('praktikant') ?? false;
            const fromTrupp = assignment.from_trupp_key ?? null;

            const slotData = { slot, assignment, person, isSpecial, isTrupp, truppName, isPraktikant, fromTrupp };

            if (truppName) {
                // This is a trupp slot (including trupp praktikanten)
                if (!truppMap.has(truppName)) {
                    truppMap.set(truppName, []);
                }
                truppMap.get(truppName)!.push(slotData);
            } else {
                // This is an individual slot (NOT part of a trupp)
                individualSlots.push(slotData);
            }
        });

    // Build final grouped slots
    const finalGroupedSlots: { truppName: string | null; slots: any[] }[] = [];

    // Add trupp groups first
    truppMap.forEach((slots, truppName) => {
        // Filter out slots without a person (unless it's a praktikant placeholder)
        const filledSlots = slots.filter(s => s.person || s.isPraktikant);

        // Only add the trupp group if it has at least one filled slot
        if (filledSlots.length > 0) {
            finalGroupedSlots.push({ truppName, slots: filledSlots });
        }
    });

    // Add individual slots as one group (if any exist)
    if (individualSlots.length > 0) {
        finalGroupedSlots.push({ truppName: null, slots: individualSlots });
    }

    // Count praktikanten for this vehicle
    const praktikantenCount = assignments.filter(a =>
        a.vehicle_key === vehicle.key &&
        (a.slot_key?.toLowerCase().includes('praktikant') || a.placeholder_text?.toLowerCase().includes('praktikant'))
    ).length;

    return (
        <Card className="border border-gray-200 bg-white">
            <CardContent className="p-1">
                {/* Vehicle Name and Image side by side */}
                <div className="flex items-center gap-3 mb-2">
                    {vehicle.image_url && (
                        <div className="w-20 h-16 overflow-hidden rounded border border-gray-200 flex-shrink-0">
                            <Image
                                src={vehicle.image_url}
                                alt={vehicle.title}
                                width={80}
                                height={64}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}
                    <h3 className="text-base font-bold text-gray-900 flex-1">{vehicle.title}</h3>
                    {praktikantenCount > 0 && (
                        <Badge className="bg-green-500 text-white font-bold text-xs px-2 py-0.5">
                            {praktikantenCount} PRAKTIKANT{praktikantenCount > 1 ? 'EN' : ''}
                        </Badge>
                    )}
                </div>

                {/* Personnel List - Grouped by Trupp */}
                <div className="grid grid-cols-2 gap-1">
                    {finalGroupedSlots.length === 0 ? (
                        <div className="col-span-2 text-center py-4 text-gray-400 italic text-sm">
                            Keine Personen zugeordnet
                        </div>
                    ) : (
                        finalGroupedSlots.map((group, groupIdx) => {
                        if (group.truppName) {
                            // Trupp group - display as a connected unit with name on left
                            // Separate persons from praktikanten
                            const personSlots = group.slots.filter(s => !s.isPraktikant);
                            const praktikantSlots = group.slots.filter(s => s.isPraktikant);
                            const hasPraktikant = praktikantSlots.length > 0;

                            return (
                                <div key={group.truppName} className="col-span-2 bg-blue-50 rounded-md p-1.5 flex items-center gap-2">
                                    <div className="font-bold text-sm text-blue-700 whitespace-nowrap px-1 flex items-center gap-1">
                                        {group.truppName}
                                    </div>
                                    <div className={`flex-1 grid ${hasPraktikant ? 'grid-cols-7' : 'grid-cols-2'} gap-1 items-start`}>
                                        {personSlots.map(({ slot, person, fromTrupp }) => (
                                            <div key={slot.key} className={`${hasPraktikant ? 'col-span-3' : ''} bg-white p-1.5 rounded flex items-center gap-2 ${fromTrupp ? 'border border-purple-400' : ''}`}>
                                                <Avatar src={person?.photo_url || undefined} name={person?.name || undefined} size={40} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-[11px] text-gray-900 leading-tight break-words">
                                                        {person?.name ?? "---"}
                                                    </p>
                                                    <p className="text-[9px] uppercase leading-tight text-blue-600 break-words">
                                                        {slot.label}
                                                        {fromTrupp && <span className="text-purple-600"> ← {fromTrupp}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {praktikantSlots.map(({ slot }) => (
                                            <div key={slot.key} className="col-span-1 bg-green-500 text-white p-1.5 rounded flex items-center justify-center min-h-[3.2rem]">
                                                <p className="font-bold text-[9px] text-center leading-tight">
                                                    + Praktikant
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        } else {
                            // Individual slots group - treat like a trupp without name
                            const personSlots = group.slots.filter(s => !s.isPraktikant);
                            const praktikantSlots = group.slots.filter(s => s.isPraktikant);
                            const hasPraktikant = praktikantSlots.length > 0;

                            return (
                                <div key={`individual-${groupIdx}`} className={`col-span-2 grid ${hasPraktikant ? 'grid-cols-7' : 'grid-cols-2'} gap-1 items-start`}>
                                    {personSlots.map(({ slot, person, isSpecial, fromTrupp }) => {
                                        const bgColor = isSpecial ? 'bg-orange-50 border-l-4 border-orange-500' :
                                                       fromTrupp ? 'bg-purple-50 border-l-2 border-purple-400' : 'bg-gray-50';
                                        return (
                                            <div key={slot.key} className={`${hasPraktikant ? 'col-span-3' : ''} ${bgColor} p-1.5 rounded flex items-center gap-2 relative`}>
                                                {isSpecial && (
                                                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl rounded-tr">
                                                        SPEZIAL
                                                    </div>
                                                )}
                                                <Avatar src={person?.photo_url || undefined} name={person?.name || undefined} size={40} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-[11px] text-gray-900 leading-tight break-words">
                                                        {person?.name ?? "---"}
                                                    </p>
                                                    <p className={`text-[9px] uppercase leading-tight break-words ${isSpecial ? 'text-orange-700 font-bold' : fromTrupp ? 'text-purple-700' : 'text-gray-500'}`}>
                                                        {slot.label}
                                                        {fromTrupp && <span> ← {fromTrupp}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {praktikantSlots.map(({ slot }) => (
                                        <div key={slot.key} className="col-span-1 bg-green-500 text-white p-1.5 rounded flex items-center justify-center min-h-[3.2rem]">
                                            <p className="font-bold text-[9px] text-center leading-tight">
                                                + Praktikant
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            );
                        }
                    }))}
                </div>
            </CardContent>
        </Card>
    )
}
