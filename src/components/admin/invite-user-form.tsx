"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { inviteUserByEmail } from "@/lib/actions/station.actions";
import { UserPlus } from "lucide-react";

type Division = {
  id: string;
  name: string;
};

type InviteUserFormProps = {
  divisions: Division[];
};

export function InviteUserForm({ divisions }: InviteUserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
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
    formData.append('email', email);
    formData.append('role', role);
    formData.append('divisionIds', selectedDivisions.join(','));

    await inviteUserByEmail(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Benutzer einladen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Benutzer einladen</DialogTitle>
          <DialogDescription>
            Fügen Sie einen registrierten Benutzer zu Ihrer Wache hinzu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="benutzer@example.com"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Der Benutzer muss bereits registriert sein.
            </p>
          </div>

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
                      id={`invite-division-${division.id}`}
                      checked={selectedDivisions.includes(division.id)}
                      onCheckedChange={() => handleToggleDivision(division.id)}
                    />
                    <Label
                      htmlFor={`invite-division-${division.id}`}
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
              {isSubmitting ? 'Wird eingeladen...' : 'Einladen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
