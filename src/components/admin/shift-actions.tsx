"use client"

import { Button } from "@/components/ui/button";
import { Copy, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { duplicateShift, deleteShift } from "@/lib/actions/shifts.actions";
import { MoreHorizontal } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

type ShiftActionsProps = {
  shiftId: string;
  hasEditAccess: boolean;
  shift: any;
};

export function ShiftActions({ shiftId, hasEditAccess, shift }: ShiftActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleDuplicate = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('shiftId', shiftId);

      try {
        await duplicateShift(formData);
        toast.success("Schicht erfolgreich dupliziert!");
      } catch (error) {
        toast.error("Fehler beim Duplizieren der Schicht");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Sind Sie sicher, dass Sie diese Schicht löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('shiftId', shiftId);

      try {
        await deleteShift(formData);
        toast.success("Schicht erfolgreich gelöscht!");
      } catch (error) {
        toast.error("Fehler beim Löschen der Schicht");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {hasEditAccess ? (
          <DropdownMenuItem asChild>
            <Link href={`/app/shifts/${shiftId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Bearbeiten
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>
            <Edit className="h-4 w-4 mr-2" />
            Bearbeiten
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDuplicate} disabled={isPending}>
          <Copy className="h-4 w-4 mr-2" />
          Duplizieren
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {hasEditAccess ? (
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={isPending}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
