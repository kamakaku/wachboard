"use client"

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clock } from "lucide-react";

type ShiftTemplate = {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
};

type ShiftTypeSelectorProps = {
  templates: ShiftTemplate[];
};

export function ShiftTypeSelector({ templates }: ShiftTypeSelectorProps) {
  const defaultTemplate = templates[0];
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    defaultTemplate?.id || ""
  );
  const [startTime, setStartTime] = useState(defaultTemplate?.start_time || "07:00");
  const [endTime, setEndTime] = useState(defaultTemplate?.end_time || "19:00");

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setStartTime(template.start_time);
      setEndTime(template.end_time);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            Keine Schicht-Vorlagen vorhanden. Erstellen Sie zuerst Vorlagen in den Einstellungen.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="shift-start">Beginn *</Label>
            <Input
              id="shift-start"
              name="start_time"
              type="time"
              required
              defaultValue="07:00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shift-end">Ende *</Label>
            <Input
              id="shift-end"
              name="end_time"
              type="time"
              required
              defaultValue="19:00"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <Label>Schichtvorlage *</Label>
        <RadioGroup
          value={selectedTemplateId}
          onValueChange={handleTemplateChange}
          className="grid grid-cols-2 gap-4"
        >
          {templates.map((template) => (
            <div key={template.id}>
              <RadioGroupItem
                value={template.id}
                id={`shift-type-${template.id}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`shift-type-${template.id}`}
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <Clock className="mb-2 h-6 w-6" />
                <span className="font-semibold">{template.label}</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {template.start_time} - {template.end_time}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="shift-start">Beginn *</Label>
          <Input
            id="shift-start"
            name="start_time"
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="shift-end">Ende *</Label>
          <Input
            id="shift-end"
            name="end_time"
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
