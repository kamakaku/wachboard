"use client"

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { deleteDivision } from "@/lib/actions/division.actions";

type DivisionActionsMenuProps = {
  division: any;
};

export function DivisionActionsMenu({ division }: DivisionActionsMenuProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              const form = document.getElementById(`delete-division-${division.id}`) as HTMLFormElement;
              form?.requestSubmit();
            }}
          >
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form id={`delete-division-${division.id}`} action={deleteDivision} className="hidden">
        <input type="hidden" name="divisionId" value={division.id} />
      </form>
    </>
  );
}
