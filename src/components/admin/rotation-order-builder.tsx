"use client"

import { useEffect, useRef, useState } from "react";
import { Box, Button, Divider, IconButton, List, ListItem, Stack, Typography } from "@mui/material";
import { ArrowDown, ArrowUp } from "lucide-react";

type DivisionRef = {
  id: string;
  name: string;
};

type RotationOrderBuilderProps = {
  divisions: DivisionRef[];
  initialOrder?: string[];
  hiddenInputName: string;
};

export function RotationOrderBuilder({
  divisions,
  initialOrder = [],
  hiddenInputName,
}: RotationOrderBuilderProps) {
  const [order, setOrder] = useState<string[]>(() => {
    const sanitized = initialOrder.filter((id) => divisions.some((d) => d.id === id));
    const missing = divisions
      .map((division) => division.id)
      .filter((id) => !sanitized.includes(id));
    return [...sanitized, ...missing];
  });
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = JSON.stringify(order);
    }
  }, [order]);

  const move = (index: number, offset: number) => {
    const newIndex = index + offset;
    if (newIndex < 0 || newIndex >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[newIndex];
      next[newIndex] = temp;
      return next;
    });
  };

  const resetOrder = () => {
    setOrder(divisions.map((division) => division.id));
  };

  const getDivisionById = (id: string) => divisions.find((division) => division.id === id);

  return (
    <Stack spacing={2}>
      <input type="hidden" name={hiddenInputName} ref={hiddenInputRef} value={JSON.stringify(order)} />
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle1" fontWeight="medium">
          Rotation Reihenfolge
        </Typography>
        <Button size="small" onClick={resetOrder}>
          Zurücksetzen
        </Button>
      </Stack>
      <List dense disablePadding>
        {order.map((divisionId, index) => {
          const division = getDivisionById(divisionId);
          if (!division) return null;
          return (
            <ListItem
              key={divisionId}
              sx={{
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
                mb: 1,
                px: 2,
                py: 1,
                bgcolor: "background.paper",
              }}
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="up"
                  >
                    <ArrowUp size={14} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => move(index, 1)}
                    disabled={index === order.length - 1}
                    aria-label="down"
                  >
                    <ArrowDown size={14} />
                  </IconButton>
                </Stack>
              }
            >
              <Typography>
                {index + 1}. {division.name}
              </Typography>
            </ListItem>
          );
        })}
      </List>
      <Divider />
    </Stack>
  );
}
