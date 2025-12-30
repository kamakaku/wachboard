"use client"

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { normalizeVehicleSlot, normalizeVehicleTrupp } from "@/lib/vehicle-config";
import type {
  VehicleConfig,
  VehicleSlotDefinition,
  VehicleTrupp,
} from "@/types";

type TruppForm = {
  id: string;
  key: string;
  slotsInput: string; // Comma-separated slot names
  allowsPraktikant?: boolean;
};

const generateId = () => Math.random().toString(36).slice(2, 9);

type VehicleConfigBuilderProps = {
  fieldName: string;
  initialConfig?: VehicleConfig;
};

export function VehicleConfigBuilder({
  fieldName,
  initialConfig,
}: VehicleConfigBuilderProps) {
  const initialTrupps = initialConfig?.trupps ?? [];
  const initialSlots = initialConfig?.slots ?? [];

  const [trupps, setTrupps] = useState<TruppForm[]>(
    initialTrupps.map((trupp) => normalizeTrupp(trupp))
  );

  const [slots, setSlots] = useState<string[]>(
    initialSlots.map((slot) => {
      if (typeof slot === "string") return slot;
      return slot.key;
    })
  );

  const [newTruppKey, setNewTruppKey] = useState("");
  const [newTruppSlots, setNewTruppSlots] = useState("");
  const [newTruppAllowsPraktikant, setNewTruppAllowsPraktikant] = useState(false);
  const [newSlotsInput, setNewSlotsInput] = useState("");
  const [editingTruppId, setEditingTruppId] = useState<string | null>(null);
  const [editTruppKey, setEditTruppKey] = useState("");
  const [editTruppSlots, setEditTruppSlots] = useState("");
  const [editTruppAllowsPraktikant, setEditTruppAllowsPraktikant] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editSlotValue, setEditSlotValue] = useState("");
  const [globalAllowsPraktikant, setGlobalAllowsPraktikant] = useState(
    (initialConfig as any)?.allowsPraktikant ?? false
  );
  const [hasNotarztPool, setHasNotarztPool] = useState(
    (initialConfig as any)?.hasNotarztPool ?? false
  );
  const [hasFuehrungsdienstPool, setHasFuehrungsdienstPool] = useState(
    (initialConfig as any)?.hasFuehrungsdienstPool ?? false
  );

  const configValue = useMemo(() => {
    const truppOutputs = trupps.map((trupp) => {
      const slotKeys = trupp.slotsInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      return {
        key: trupp.key.trim(),
        slots: slotKeys,
        ...(trupp.allowsPraktikant ? { allowsPraktikant: true } : {}),
      };
    }).filter((trupp) => trupp.slots.length > 0);

    const config: any = {};
    if (truppOutputs.length > 0) {
      config.trupps = truppOutputs;
    }
    if (slots.length > 0) {
      config.slots = slots;
    }
    if (globalAllowsPraktikant) {
      config.allowsPraktikant = true;
    }
    if (hasNotarztPool) {
      config.hasNotarztPool = true;
    }
    if (hasFuehrungsdienstPool) {
      config.hasFuehrungsdienstPool = true;
    }

    return JSON.stringify(config, null, 2);
  }, [trupps, slots, globalAllowsPraktikant, hasNotarztPool, hasFuehrungsdienstPool]);

  function normalizeTrupp(raw: VehicleTrupp): TruppForm {
    const normalized = normalizeVehicleTrupp(raw);
    const slotsInput = normalized.slots.map((slot) => slot.key).join(", ");

    return {
      id: generateId(),
      key: normalized.key,
      slotsInput,
      allowsPraktikant: (normalized as any).allowsPraktikant ?? false,
    };
  }

  const handleAddTrupp = () => {
    if (!newTruppKey.trim()) return;

    setTrupps((prev) => [
      ...prev,
      {
        id: generateId(),
        key: newTruppKey.trim(),
        slotsInput: newTruppSlots.trim(),
        allowsPraktikant: newTruppAllowsPraktikant,
      },
    ]);

    setNewTruppKey("");
    setNewTruppSlots("");
    setNewTruppAllowsPraktikant(false);
  };

  const removeTrupp = (id: string) =>
    setTrupps((prev) => prev.filter((trupp) => trupp.id !== id));

  const startEditingTrupp = (trupp: TruppForm) => {
    setEditingTruppId(trupp.id);
    setEditTruppKey(trupp.key);
    setEditTruppSlots(trupp.slotsInput);
    setEditTruppAllowsPraktikant(trupp.allowsPraktikant ?? false);
  };

  const cancelEditingTrupp = () => {
    setEditingTruppId(null);
    setEditTruppKey("");
    setEditTruppSlots("");
    setEditTruppAllowsPraktikant(false);
  };

  const saveEditingTrupp = () => {
    if (!editTruppKey.trim() || !editingTruppId) return;

    setTrupps((prev) =>
      prev.map((trupp) =>
        trupp.id === editingTruppId
          ? {
              ...trupp,
              key: editTruppKey.trim(),
              slotsInput: editTruppSlots.trim(),
              allowsPraktikant: editTruppAllowsPraktikant,
            }
          : trupp
      )
    );

    cancelEditingTrupp();
  };

  const handleAddSlots = () => {
    if (!newSlotsInput.trim()) return;

    const newSlotKeys = newSlotsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setSlots((prev) => [...prev, ...newSlotKeys]);
    setNewSlotsInput("");
  };

  const removeSlot = (index: number) =>
    setSlots((prev) => prev.filter((_, idx) => idx !== index));

  const startEditingSlot = (index: number) => {
    setEditingSlotIndex(index);
    setEditSlotValue(slots[index]);
  };

  const cancelEditingSlot = () => {
    setEditingSlotIndex(null);
    setEditSlotValue("");
  };

  const saveEditingSlot = () => {
    if (!editSlotValue.trim() || editingSlotIndex === null) return;

    setSlots((prev) =>
      prev.map((slot, idx) =>
        idx === editingSlotIndex ? editSlotValue.trim() : slot
      )
    );

    cancelEditingSlot();
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name={fieldName} value={configValue} />

      <div className="space-y-2">
        <div className="flex items-center space-x-2 p-3 rounded border bg-muted/10">
          <Checkbox
            id="global-praktikant"
            checked={globalAllowsPraktikant}
            onCheckedChange={(checked) => setGlobalAllowsPraktikant(checked === true)}
          />
          <Label htmlFor="global-praktikant" className="text-sm font-normal cursor-pointer">
            Praktikant kann auf diesem Fahrzeug hinzugefügt werden (global)
          </Label>
        </div>
        <div className="flex items-center space-x-2 p-3 rounded border bg-muted/10">
          <Checkbox
            id="has-notarzt-pool"
            checked={hasNotarztPool}
            onCheckedChange={(checked) => setHasNotarztPool(checked === true)}
          />
          <Label htmlFor="has-notarzt-pool" className="text-sm font-normal cursor-pointer">
            Dieses Fahrzeug hat einen separaten Notarzt-Pool
          </Label>
        </div>
        <div className="flex items-center space-x-2 p-3 rounded border bg-muted/10">
          <Checkbox
            id="has-fuehrungsdienst-pool"
            checked={hasFuehrungsdienstPool}
            onCheckedChange={(checked) => setHasFuehrungsdienstPool(checked === true)}
          />
          <Label htmlFor="has-fuehrungsdienst-pool" className="text-sm font-normal cursor-pointer">
            Dieses Fahrzeug hat einen separaten Führungsdienst-Pool
          </Label>
        </div>
      </div>

      <Tabs defaultValue="trupps" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trupps">Trupps</TabsTrigger>
          <TabsTrigger value="slots">Einzelne Slots</TabsTrigger>
        </TabsList>

        <TabsContent value="trupps" className="space-y-4 mt-4">
          <div>
            <p className="text-sm font-semibold mb-1">Trupps</p>
            <p className="text-xs text-muted-foreground">
              Erstellen Sie Trupps mit ihren Positionen
            </p>
          </div>

          {/* Add new Trupp */}
          <div className="grid gap-3 p-4 rounded border bg-muted/10">
            <div className="grid gap-2">
              <Label htmlFor="new-trupp-key">Trupp-Name *</Label>
              <Input
                id="new-trupp-key"
                placeholder="z.B. Trupp 1"
                value={newTruppKey}
                onChange={(e) => setNewTruppKey(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-trupp-slots">Positionen (kommagetrennt) *</Label>
              <Input
                id="new-trupp-slots"
                placeholder="z.B. Truppführer, Maschinist, Angriffstrupp"
                value={newTruppSlots}
                onChange={(e) => setNewTruppSlots(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Geben Sie die Positionen kommagetrennt ein
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-trupp-praktikant"
                checked={newTruppAllowsPraktikant}
                onCheckedChange={(checked) => setNewTruppAllowsPraktikant(checked === true)}
              />
              <Label htmlFor="new-trupp-praktikant" className="text-sm font-normal cursor-pointer">
                Praktikant kann hinzugefügt werden
              </Label>
            </div>
            <Button type="button" onClick={handleAddTrupp} className="w-full">
              Trupp hinzufügen
            </Button>
          </div>

          {/* List of Trupps */}
          {trupps.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Hinzugefügte Trupps:</p>
              {trupps.map((trupp) => {
                const slotCount = trupp.slotsInput
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0).length;

                const isEditing = editingTruppId === trupp.id;

                if (isEditing) {
                  return (
                    <div
                      key={trupp.id}
                      className="rounded border border-primary p-3 space-y-3 bg-muted/20"
                    >
                      <div className="grid gap-2">
                        <Label>Trupp-Name *</Label>
                        <Input
                          placeholder="z.B. Trupp 1"
                          value={editTruppKey}
                          onChange={(e) => setEditTruppKey(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Positionen (kommagetrennt) *</Label>
                        <Input
                          placeholder="z.B. Truppführer, Maschinist, Angriffstrupp"
                          value={editTruppSlots}
                          onChange={(e) => setEditTruppSlots(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-trupp-praktikant-${trupp.id}`}
                          checked={editTruppAllowsPraktikant}
                          onCheckedChange={(checked) => setEditTruppAllowsPraktikant(checked === true)}
                        />
                        <Label htmlFor={`edit-trupp-praktikant-${trupp.id}`} className="text-sm font-normal cursor-pointer">
                          Praktikant kann hinzugefügt werden
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={saveEditingTrupp}
                        >
                          Speichern
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={cancelEditingTrupp}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={trupp.id}
                    className="rounded border border-muted p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{trupp.key}</p>
                          {trupp.allowsPraktikant && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              +Praktikant
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {slotCount} Position{slotCount !== 1 ? "en" : ""}:{" "}
                          {trupp.slotsInput || "(keine)"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => startEditingTrupp(trupp)}
                        >
                          Bearbeiten
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => removeTrupp(trupp.id)}
                          className="text-destructive"
                        >
                          Entfernen
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Trupps hinzugefügt
            </p>
          )}
        </TabsContent>

        <TabsContent value="slots" className="space-y-4 mt-4">
          <div>
            <p className="text-sm font-semibold mb-1">Einzelne Slots</p>
            <p className="text-xs text-muted-foreground">
              Positionen ohne Trupp-Zuordnung (z.B. einzelne Fahrer)
            </p>
          </div>

          {/* Add new Slots */}
          <div className="grid gap-3 p-4 rounded border bg-muted/10">
            <div className="grid gap-2">
              <Label htmlFor="new-slots">Positionen (kommagetrennt) *</Label>
              <Input
                id="new-slots"
                placeholder="z.B. Fahrer, Beifahrer"
                value={newSlotsInput}
                onChange={(e) => setNewSlotsInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Geben Sie die Positionen kommagetrennt ein
              </p>
            </div>
            <Button type="button" onClick={handleAddSlots} className="w-full">
              Slots hinzufügen
            </Button>
          </div>

          {/* List of Slots */}
          {slots.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Hinzugefügte Slots:</p>
              {editingSlotIndex !== null ? (
                <div className="p-3 rounded border border-primary bg-muted/20 space-y-3">
                  <div className="grid gap-2">
                    <Label>Position bearbeiten *</Label>
                    <Input
                      placeholder="z.B. Fahrer"
                      value={editSlotValue}
                      onChange={(e) => setEditSlotValue(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={saveEditingSlot}
                    >
                      Speichern
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={cancelEditingSlot}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {slots.map((slot, idx) => (
                  <div
                    key={`${slot}-${idx}`}
                    className={`inline-flex items-center gap-2 rounded border px-3 py-2 ${
                      editingSlotIndex === idx
                        ? "opacity-50"
                        : "border-muted"
                    }`}
                  >
                    <span className="text-sm">{slot}</span>
                    {editingSlotIndex === null && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => startEditingSlot(idx)}
                          className="h-auto p-0 hover:bg-transparent"
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => removeSlot(idx)}
                          className="h-auto p-0 text-destructive hover:bg-transparent"
                        >
                          ✕
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Slots hinzugefügt
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
