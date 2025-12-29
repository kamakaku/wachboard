"use client"

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Card } from '../ui/card';
import { GripVertical } from 'lucide-react';
import type { people } from '@/types/index';
import { Avatar } from '../ui/avatar';

type Person = people['Row'];

export function DraggablePerson({ person, id, fromSlot, isOverlay = false }: { person: Person, id: string, fromSlot?: string, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: {
        type: 'person',
        person: person,
        fromSlot: fromSlot, // Pass the originating slot
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2 flex items-center gap-3 touch-none bg-background",
        isDragging && "opacity-50 z-50",
        isOverlay && "shadow-lg"
      )}
    >
      <div {...listeners} {...attributes} className="cursor-grab">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <Avatar
        src={person.photo_url}
        name={person.name}
        size={36}
        className="flex-shrink-0"
      />
      <div className="min-w-0">
        <p className="font-semibold truncate">{person.name}</p>
        <p className="text-sm text-muted-foreground truncate">
          {person.rank ?? "–"}
        </p>
      </div>
    </Card>
  );
}
