"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
} from "@/lib/actions/settings.actions";

type ShiftTemplate = {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
};

type ShiftTemplateManagerProps = {
  templates: ShiftTemplate[];
};

export function ShiftTemplateManager({ templates }: ShiftTemplateManagerProps) {
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ShiftTemplate | null>(null);

  const handleEdit = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (template: ShiftTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Schicht-Vorlagen</CardTitle>
            <CardDescription>
              Erstellen und verwalten Sie Ihre Schicht-Vorlagen
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neue Schicht
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Schicht erstellen</DialogTitle>
                <DialogDescription>
                  Erstellen Sie eine neue Schicht-Vorlage
                </DialogDescription>
              </DialogHeader>
              <form action={createShiftTemplate} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-label">Name *</Label>
                  <Input
                    id="create-label"
                    name="label"
                    placeholder="z.B. Tagesdienst, Nachtdienst"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="create-start">Beginn *</Label>
                    <Input
                      id="create-start"
                      name="start_time"
                      type="time"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="create-end">Ende *</Label>
                    <Input
                      id="create-end"
                      name="end_time"
                      type="time"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button type="submit">Erstellen</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Keine Schicht-Vorlagen vorhanden.</p>
            <p className="text-sm mt-2">Erstellen Sie Ihre erste Schicht-Vorlage.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Beginn</TableHead>
                <TableHead>Ende</TableHead>
                <TableHead className="w-[100px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.label}</TableCell>
                  <TableCell>{template.start_time}</TableCell>
                  <TableCell>{template.end_time}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schicht bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Schicht-Vorlage
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <form action={updateShiftTemplate} className="space-y-4">
              <input type="hidden" name="id" value={editingTemplate.id} />
              <div className="grid gap-2">
                <Label htmlFor="edit-label">Name *</Label>
                <Input
                  id="edit-label"
                  name="label"
                  defaultValue={editingTemplate.label}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-start">Beginn *</Label>
                  <Input
                    id="edit-start"
                    name="start_time"
                    type="time"
                    defaultValue={editingTemplate.start_time}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-end">Ende *</Label>
                  <Input
                    id="edit-end"
                    name="end_time"
                    type="time"
                    defaultValue={editingTemplate.end_time}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit">Speichern</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schicht löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diese Schicht-Vorlage löschen möchten?
            </DialogDescription>
          </DialogHeader>
          {templateToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{templateToDelete.label}</p>
                <p className="text-sm text-muted-foreground">
                  {templateToDelete.start_time} - {templateToDelete.end_time}
                </p>
              </div>
              <form action={deleteShiftTemplate} className="flex gap-2 justify-end">
                <input type="hidden" name="id" value={templateToDelete.id} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" variant="destructive">
                  Löschen
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
