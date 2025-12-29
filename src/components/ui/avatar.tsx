"use client"

import Image from "next/image";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ src, name, size = 36, className }: AvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full bg-muted text-muted-foreground/70 flex items-center justify-center border border-border",
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? "Avatar"}
          width={size}
          height={size}
          className="object-cover"
        />
      ) : (
        <span className="text-xs font-semibold">{initials || "?"}</span>
      )}
    </div>
  );
}
