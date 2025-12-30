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
  LogOut,
  UserPlus,
} from "lucide-react";
import { logout } from "@/lib/actions/auth.actions";

const appRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/app",
    roles: ["ADMIN", "EDITOR", "VIEWER"], // All roles can see dashboard
  },
  {
    label: "Dienstplan",
    icon: Calendar,
    href: "/app/shifts",
    roles: ["ADMIN", "EDITOR"], // ADMIN and EDITOR can manage shifts
  },
  {
    label: "Personal",
    icon: Users,
    href: "/app/people",
    roles: ["ADMIN", "EDITOR"], // ADMIN and EDITOR can manage people
  },
  {
    label: "Benutzer",
    icon: UserCog,
    href: "/app/users",
    roles: ["ADMIN"], // Only ADMIN can manage users
  },
  {
    label: "Beitrittsanfragen",
    icon: UserPlus,
    href: "/app/join-requests",
    roles: ["ADMIN"], // Only ADMIN can manage join requests
  },
  {
    label: "Fahrzeuge",
    icon: Car,
    href: "/app/vehicles",
    roles: ["ADMIN"], // Only ADMIN can manage vehicles
  },
  {
    label: "Wachabteilungen",
    icon: Layers,
    href: "/app/divisions",
    roles: ["ADMIN"], // Only ADMIN can manage divisions
  },
  {
    label: "Einstellungen",
    icon: Settings,
    href: "/app/settings",
    roles: ["ADMIN"], // Only ADMIN can access settings
  },
];

type AdminSidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
  userRole: string;
  divisionIds: string[];
};

export function AdminSidebar({ isCollapsed, onToggle, userRole, divisionIds }: AdminSidebarProps) {
  const pathname = usePathname();

  // Filter routes based on user role
  const visibleRoutes = appRoutes.filter(route => route.roles.includes(userRole));

  return (
    <div className="flex flex-col h-full bg-muted/40 border-r">
      <div className="flex-1 py-4">
        <div className="px-3">
          {!isCollapsed && (
            <div className="mb-2 px-4">
              <h2 className="text-lg font-semibold tracking-tight">
                {userRole === 'ADMIN' ? 'Admin' : userRole === 'EDITOR' ? 'Editor' : 'Viewer'}
              </h2>
              {userRole === 'EDITOR' && divisionIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {divisionIds.length} Division{divisionIds.length > 1 ? 'en' : ''}
                </p>
              )}
            </div>
          )}
          <div className="space-y-1">
            {visibleRoutes.map((route) => (
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

      {/* Bottom section with logout and toggle */}
      <div className="border-t">
        {/* Logout button */}
        <div className="p-3">
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {isCollapsed ? (
                <LogOut className="h-4 w-4" />
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Abmelden
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Toggle button */}
        <div className="p-3 pt-0">
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
    </div>
  );
}
