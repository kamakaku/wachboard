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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Users, Stethoscope, ShieldAlert } from "lucide-react";

type Person = {
  id: string;
  name: string;
  rank?: string;
  tags?: string[];
  photo_url?: string;
};

type PoolsManagerProps = {
  people: Person[];
  onPoolsChange: (pools: { notarzt: string[]; fuehrungsdienst: string[] }) => void;
};

export function ShiftPoolsManager({ people, onPoolsChange }: PoolsManagerProps) {
  const [notarztPool, setNotarztPool] = useState<string[]>([]);
  const [fuehrungsdienstPool, setFuehrungsdienstPool] = useState<string[]>([]);

  const togglePersonInPool = (personId: string, pool: 'notarzt' | 'fuehrungsdienst') => {
    if (pool === 'notarzt') {
      const newPool = notarztPool.includes(personId)
        ? notarztPool.filter(id => id !== personId)
        : [...notarztPool, personId];
      setNotarztPool(newPool);
      onPoolsChange({ notarzt: newPool, fuehrungsdienst: fuehrungsdienstPool });
    } else {
      const newPool = fuehrungsdienstPool.includes(personId)
        ? fuehrungsdienstPool.filter(id => id !== personId)
        : [...fuehrungsdienstPool, personId];
      setFuehrungsdienstPool(newPool);
      onPoolsChange({ notarzt: notarztPool, fuehrungsdienst: newPool });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spezial-Personalpools</CardTitle>
        <CardDescription>
          Wählen Sie Personen für Notarzt- und Führungsdienst-Pools aus
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notarzt Pool */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold">Notarzt-Pool ({notarztPool.length})</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded">
            {people.map((person) => (
              <div
                key={`notarzt-${person.id}`}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
              >
                <Checkbox
                  id={`notarzt-${person.id}`}
                  checked={notarztPool.includes(person.id)}
                  onCheckedChange={() => togglePersonInPool(person.id, 'notarzt')}
                />
                <Label
                  htmlFor={`notarzt-${person.id}`}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Avatar
                    src={person.photo_url ?? undefined}
                    name={person.name}
                    size={24}
                  />
                  <span className="text-sm">{person.name}</span>
                  {person.rank && (
                    <span className="text-xs text-muted-foreground">({person.rank})</span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Führungsdienst Pool */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Führungsdienst-Pool ({fuehrungsdienstPool.length})</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded">
            {people.map((person) => (
              <div
                key={`fuehrung-${person.id}`}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
              >
                <Checkbox
                  id={`fuehrung-${person.id}`}
                  checked={fuehrungsdienstPool.includes(person.id)}
                  onCheckedChange={() => togglePersonInPool(person.id, 'fuehrungsdienst')}
                />
                <Label
                  htmlFor={`fuehrung-${person.id}`}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Avatar
                    src={person.photo_url ?? undefined}
                    name={person.name}
                    size={24}
                  />
                  <span className="text-sm">{person.name}</span>
                  {person.rank && (
                    <span className="text-xs text-muted-foreground">({person.rank})</span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
