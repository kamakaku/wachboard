"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal } from "lucide-react";
import { togglePersonActive, updatePerson, deletePerson } from "@/lib/actions/people.actions";

type Division = {
  id: string;
  name: string;
  color?: string;
};

type PeopleActionsMenuProps = {
  person: any;
  divisions: Division[];
};

export function PeopleActionsMenu({ person, divisions }: PeopleActionsMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              const form = document.getElementById(`toggle-person-${person.id}`) as HTMLFormElement;
              form?.requestSubmit();
            }}
          >
            {person.active ? "Deaktivieren" : "Aktivieren"}
          </DropdownMenuItem>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Bearbeiten
            </DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuItem
            className="text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              const form = document.getElementById(`delete-person-${person.id}`) as HTMLFormElement;
              form?.requestSubmit();
            }}
          >
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Person bearbeiten</DialogTitle>
          <DialogDescription>
            Aktualisieren Sie Name, Rang und Qualifikationen.
          </DialogDescription>
        </DialogHeader>
        <form action={updatePerson} className="space-y-4">
          <input type="hidden" name="personId" value={person.id} />
          <div className="grid gap-2">
            <Label htmlFor={`edit-name-${person.id}`}>Name *</Label>
            <Input
              id={`edit-name-${person.id}`}
              name="name"
              defaultValue={person.name}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-rank-${person.id}`}>Rang</Label>
            <Input
              id={`edit-rank-${person.id}`}
              name="rank"
              defaultValue={person.rank ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-tags-${person.id}`}>Qualifikationen</Label>
            <Input
              id={`edit-tags-${person.id}`}
              name="tags"
              defaultValue={person.tags?.join(", ") ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-divisions-${person.id}`}>Wachabteilungen (optional)</Label>
            <div className="border rounded-md p-3 space-y-2">
              {divisions && divisions.length > 0 ? (
                divisions.map((division) => (
                  <div key={division.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-division-${person.id}-${division.id}`}
                      name="division_ids"
                      value={division.id}
                      defaultChecked={person.division_ids?.includes(division.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label
                      htmlFor={`edit-division-${person.id}-${division.id}`}
                      className="text-sm cursor-pointer flex items-center gap-2"
                    >
                      {division.color && (
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: division.color }}
                        />
                      )}
                      {division.name}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Keine Wachabteilungen verfügbar</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Leer lassen = für alle Wachabteilungen verfügbar
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-photo-url-${person.id}`}>Foto-URL</Label>
            <Input
              id={`edit-photo-url-${person.id}`}
              name="photo_url"
              defaultValue={person.photo_url ?? ""}
            />
            <Button variant="outline" type="button" asChild>
              <label>
                Neues Foto hochladen
                <input type="file" name="photo_file" accept="image/*" className="hidden" />
              </label>
            </Button>
          </div>
          <DialogFooter>
            <Button type="submit">
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <form id={`toggle-person-${person.id}`} action={togglePersonActive} className="hidden">
        <input type="hidden" name="personId" value={person.id} />
        <input type="hidden" name="currentStatus" value={person.active ? "true" : "false"} />
      </form>
      <form id={`delete-person-${person.id}`} action={deletePerson} className="hidden">
        <input type="hidden" name="personId" value={person.id} />
      </form>
    </Dialog>
  );
}
