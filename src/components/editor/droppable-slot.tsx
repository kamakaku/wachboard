"use client"

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { DraggablePerson } from './draggable-person';
import type { people } from '@/types/index';

type Person = people['Row'];

interface DroppableSlotProps {
  id: string;
  slotName: string;
  slotDescription?: string;
  person: Person | null;
  className?: string;
  data?: any;
}

export function DroppableSlot({ id, slotName, slotDescription, person, className, data }: DroppableSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: data,
  });

  return (
    <div ref={setNodeRef} className={cn("transition-colors", isOver ? 'bg-primary/10 rounded-md' : '')}>
        <div className="flex justify-between items-center w-full mb-1">
            <div>
              <span className="text-sm font-medium text-muted-foreground">{slotName}</span>
              {slotDescription && (
                <p className="text-xs text-muted-foreground/80">{slotDescription}</p>
              )}
            </div>
        </div>
        <div
        className={cn(
            "p-2 rounded-md border border-dashed min-h-[60px] flex flex-col justify-center",
            isOver ? 'border-primary' : 'border-border',
            className
        )}
        >
            {person ? (
                <DraggablePerson person={person} id={`person-${person.id}`} fromSlot={id} />
            ) : (
                <div className="text-center text-sm text-muted-foreground/50 py-2.5">Leer</div>
            )}
        </div>
    </div>
  );
}
