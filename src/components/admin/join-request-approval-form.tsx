"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { acceptJoinRequest } from "@/lib/actions/station.actions";

type Division = {
  id: string;
  name: string;
};

type JoinRequestApprovalFormProps = {
  requestId: string;
  divisions: Division[];
};

export function JoinRequestApprovalForm({
  requestId,
  divisions,
}: JoinRequestApprovalFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<string>("VIEWER");
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
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
    formData.append('requestId', requestId);
    formData.append('role', role);
    formData.append('divisionIds', selectedDivisions.join(','));

    await acceptJoinRequest(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          Akzeptieren
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Beitrittsanfrage akzeptieren</DialogTitle>
          <DialogDescription>
            Wählen Sie die Rolle und optional die Divisionen für diesen Benutzer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="role">Rolle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">Viewer (nur lesen)</SelectItem>
                <SelectItem value="EDITOR">Editor (Dienstpläne bearbeiten)</SelectItem>
                <SelectItem value="ADMIN">Admin (volle Kontrolle)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "EDITOR" && divisions.length > 0 && (
            <div>
              <Label>Divisionen (für Editor)</Label>
              <div className="space-y-2 mt-2 max-h-[200px] overflow-y-auto border rounded p-3">
                {divisions.map((division) => (
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
              <p className="text-xs text-muted-foreground mt-1">
                Wählen Sie die Divisionen, die dieser Editor verwalten darf.
              </p>
            </div>
          )}

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
              {isSubmitting ? 'Wird akzeptiert...' : 'Akzeptieren'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
