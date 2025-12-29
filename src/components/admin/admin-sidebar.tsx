"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Users,
  Car,
  UserCog,
  Settings,
  LayoutDashboard,
  Layers,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const adminRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
  },
  {
    label: "Dienstplan",
    icon: Calendar,
    href: "/admin/shifts",
  },
  {
    label: "Personal",
    icon: Users,
    href: "/admin/people",
  },
  {
    label: "Benutzer",
    icon: UserCog,
    href: "/admin/users",
  },
  {
    label: "Fahrzeuge",
    icon: Car,
    href: "/admin/vehicles",
  },
  {
    label: "Wachabteilungen",
    icon: Layers,
    href: "/admin/divisions",
  },
  {
    label: "Einstellungen",
    icon: Settings,
    href: "/admin/settings",
  },
];

type AdminSidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

export function AdminSidebar({ isCollapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-muted/40 border-r">
      <div className="flex-1 py-4">
        <div className="px-3">
          {!isCollapsed && (
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              Admin
            </h2>
          )}
          <div className="space-y-1">
            {adminRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-muted rounded-lg transition",
                  pathname === route.href
                    ? "bg-muted text-primary"
                    : "text-muted-foreground"
                )}
                title={isCollapsed ? route.label : undefined}
              >
                <div className={cn("flex items-center", isCollapsed ? "justify-center w-full" : "flex-1")}>
                  <route.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                  {!isCollapsed && route.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle button at bottom */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Einklappen
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
