"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updateUserDivisions } from "@/lib/actions/user.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Division = {
  id: string;
  name: string;
};

type UserDivisionManagerProps = {
  membershipId: string;
  currentDivisionIds: string[] | null;
  allDivisions: Division[];
  role: string;
};

export function UserDivisionManager({
  membershipId,
  currentDivisionIds,
  allDivisions,
  role,
}: UserDivisionManagerProps) {
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(
    currentDivisionIds || []
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleDivision = (divisionId: string) => {
    setSelectedDivisions((prev) =>
      prev.includes(divisionId)
        ? prev.filter((id) => id !== divisionId)
        : [...prev, divisionId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('membershipId', membershipId);
    formData.append('divisionIds', selectedDivisions.join(','));

    await updateUserDivisions(formData);
  };

  // Only show for EDITOR role
  if (role !== 'EDITOR') {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const selectedDivisionNames = allDivisions
    .filter((d) => selectedDivisions.includes(d.id))
    .map((d) => d.name)
    .join(', ');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {selectedDivisionNames || 'Keine Divisionen'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Divisionen zuweisen</DialogTitle>
          <DialogDescription>
            Wählen Sie die Divisionen aus, die dieser Editor verwalten darf.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {allDivisions.map((division) => (
              <div key={division.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`division-${division.id}`}
                  checked={selectedDivisions.includes(division.id)}
                  onCheckedChange={() => handleToggleDivision(division.id)}
                />
                <Label
                  htmlFor={`division-${division.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {division.name}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
