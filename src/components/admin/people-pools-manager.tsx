"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PeopleActionsMenu } from "@/components/admin/people-actions-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, ShieldAlert, Users } from "lucide-react";
import { createPerson } from "@/lib/actions/people.actions";

type Person = {
  id: string;
  name: string;
  rank?: string;
  tags?: string[];
  photo_url?: string;
  active: boolean;
  email?: string;
  person_type?: 'MITARBEITER' | 'NOTARZT' | 'FUEHRUNGSDIENST';
  division_ids?: string[];
};

type Division = {
  id: string;
  name: string;
  color?: string;
};

type PeoplePoolsManagerProps = {
  people: Person[];
  divisions: Division[];
};

export function PeoplePoolsManager({ people, divisions }: PeoplePoolsManagerProps) {
  const mitarbeiter = people.filter(p => !p.person_type || p.person_type === 'MITARBEITER');
  const notarzte = people.filter(p => p.person_type === 'NOTARZT');
  const fuehrungsdienst = people.filter(p => p.person_type === 'FUEHRUNGSDIENST');

  const renderPersonForm = (personType: 'MITARBEITER' | 'NOTARZT' | 'FUEHRUNGSDIENST', title: string) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Neue Person hinzufügen</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Name, Rang, Qualifikationen und Foto erfassen
          </DialogDescription>
        </DialogHeader>
        <form action={createPerson} className="space-y-4">
          <input type="hidden" name="person_type" value={personType} />
          <div className="grid gap-2">
            <Label htmlFor={`create-name-${personType}`}>Name *</Label>
            <Input
              id={`create-name-${personType}`}
              name="name"
              placeholder="z. B. Mustermann, Max"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`create-rank-${personType}`}>Rang</Label>
            <Input
              id={`create-rank-${personType}`}
              name="rank"
              placeholder="z. B. HBM, OBM, BM"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`create-tags-${personType}`}>Qualifikationen</Label>
            <Input
              id={`create-tags-${personType}`}
              name="tags"
              placeholder="GF, MA, AT"
            />
            <p className="text-sm text-muted-foreground">
              Kommagetrennt eingeben
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`create-divisions-${personType}`}>Wachabteilungen (optional)</Label>
            <div className="border rounded-md p-3 space-y-2">
              {divisions && divisions.length > 0 ? (
                divisions.map((division) => (
                  <div key={division.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`division-${personType}-${division.id}`}
                      name="division_ids"
                      value={division.id}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label
                      htmlFor={`division-${personType}-${division.id}`}
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
            <Label htmlFor={`create-photo_url-${personType}`}>Foto-URL (optional)</Label>
            <Input
              id={`create-photo_url-${personType}`}
              name="photo_url"
              type="url"
              placeholder="https://..."
            />
            <Button variant="outline" type="button" asChild>
              <label>
                Foto hochladen
                <input type="file" name="photo_file" accept="image/*" className="hidden" />
              </label>
            </Button>
          </div>
          <DialogFooter>
            <Button type="submit">
              Person hinzufügen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  const renderPersonTable = (persons: Person[]) => (
    persons && persons.length > 0 ? (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Avatar</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Rang</TableHead>
            <TableHead>Qualifikationen</TableHead>
            <TableHead>Wachabteilungen</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {persons.map((person) => (
            <TableRow key={person.id}>
              <TableCell>
                <Avatar
                  src={person.photo_url ?? undefined}
                  name={person.name ?? undefined}
                  size={36}
                />
              </TableCell>
              <TableCell>
                <p className="font-medium">{person.name}</p>
                {person.email && (
                  <p className="text-sm text-muted-foreground">
                    {person.email}
                  </p>
                )}
              </TableCell>
              <TableCell>{person.rank || "-"}</TableCell>
              <TableCell>
                {person.tags && person.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {person.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                {person.division_ids && person.division_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {person.division_ids.map((divisionId: string) => {
                      const division = divisions.find(d => d.id === divisionId);
                      return division ? (
                        <Badge key={divisionId} variant="secondary" className="flex items-center gap-1">
                          {division.color && (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: division.color }}
                            />
                          )}
                          {division.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Alle</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={person.active ? "default" : "secondary"}>
                  {person.active ? "Aktiv" : "Inaktiv"}
                </Badge>
              </TableCell>
              <TableCell>
                <PeopleActionsMenu person={person} divisions={divisions} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ) : (
      <p className="text-muted-foreground text-center py-8">
        Keine Personen vorhanden. Erstellen Sie den ersten Eintrag.
      </p>
    )
  );

  return (
    <Tabs defaultValue="mitarbeiter" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="mitarbeiter">
          <Users className="h-4 w-4 mr-2" />
          Mitarbeiter ({mitarbeiter.length})
        </TabsTrigger>
        <TabsTrigger value="notarzt">
          <Stethoscope className="h-4 w-4 mr-2" />
          Notarzt-Pool ({notarzte.length})
        </TabsTrigger>
        <TabsTrigger value="fuehrungsdienst">
          <ShieldAlert className="h-4 w-4 mr-2" />
          Führungsdienst-Pool ({fuehrungsdienst.length})
        </TabsTrigger>
      </TabsList>

      {/* Mitarbeiter Tab */}
      <TabsContent value="mitarbeiter">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Mitarbeiter</CardTitle>
                <CardDescription>
                  Reguläre Mitarbeiter ({mitarbeiter.length})
                </CardDescription>
              </div>
              {renderPersonForm('MITARBEITER', 'Neuen Mitarbeiter hinzufügen')}
            </div>
          </CardHeader>
          <CardContent>
            {renderPersonTable(mitarbeiter)}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notarzt Pool Tab */}
      <TabsContent value="notarzt">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-red-600" />
                  Notarzt-Pool
                </CardTitle>
                <CardDescription>
                  Notärzte, die im Dienstplan eingesetzt werden können ({notarzte.length})
                </CardDescription>
              </div>
              {renderPersonForm('NOTARZT', 'Neuen Notarzt hinzufügen')}
            </div>
          </CardHeader>
          <CardContent>
            {renderPersonTable(notarzte)}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Führungsdienst Pool Tab */}
      <TabsContent value="fuehrungsdienst">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-blue-600" />
                  Führungsdienst-Pool
                </CardTitle>
                <CardDescription>
                  Führungskräfte, die im Dienstplan eingesetzt werden können ({fuehrungsdienst.length})
                </CardDescription>
              </div>
              {renderPersonForm('FUEHRUNGSDIENST', 'Neue Führungskraft hinzufügen')}
            </div>
          </CardHeader>
          <CardContent>
            {renderPersonTable(fuehrungsdienst)}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
