import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { DraggablePerson } from "./draggable-person";
import type { people } from '@/types/index';

type Person = people['Row'];

export function PersonPool({ people, assignedPersonIds }: { people: Person[], assignedPersonIds: Set<string> }) {
    
    const availablePeople = people.filter(p => !assignedPersonIds.has(p.id));
    
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Personal</CardTitle>
                <Input placeholder="Personal suchen..." />
            </CardHeader>
            <CardContent className="space-y-2 h-[calc(100vh-200px)] overflow-y-auto">
                {availablePeople.length > 0 ? (
                    availablePeople.map(person => (
                        <DraggablePerson key={person.id} id={`person-${person.id}`} person={person} />
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-4">Kein Personal verfügbar</p>
                )}
            </CardContent>
        </Card>
    )
}
