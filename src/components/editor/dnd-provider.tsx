"use client"

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import React, { useState } from "react";
import { DraggablePerson } from "./draggable-person";

export function DndProvider({ children, onDragEnd }: { children: React.ReactNode, onDragEnd: (event: DragEndEvent) => void }) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };
    
    const handleDragCancel = () => {
        setActiveId(null);
    };

    return (
        <DndContext 
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={handleDragCancel}
        >
            {children}
            <DragOverlay>
                {activeId && activeId.startsWith('person-') ? (
                    <DraggablePerson 
                        id={activeId}
                        person={{ id: activeId.replace('person-',''), name: 'Dragging', rank: '...', station_id: '', active: true, created_at: '' }}
                        isOverlay
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
