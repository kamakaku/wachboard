"use client"

import { useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

type AdminLayoutWrapperProps = {
  children: React.ReactNode;
  userRole: string;
  divisionIds: string[];
};

export function AdminLayoutWrapper({ children, userRole, divisionIds }: AdminLayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="relative h-full w-full">
      {/* Sidebar - starts below header (64px is typical MUI AppBar height) */}
      <div
        className={`fixed left-0 h-full hidden md:flex md:flex-col transition-all duration-300 z-40 ${
          sidebarOpen ? "md:w-72" : "md:w-16"
        }`}
        style={{ top: '64px', height: 'calc(100vh - 64px)' }}
      >
        <AdminSidebar
          isCollapsed={!sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          userRole={userRole}
          divisionIds={divisionIds}
        />
      </div>

      {/* Content wrapper with left margin */}
      <div
        className={`h-full transition-all duration-300 ${
          sidebarOpen ? "md:ml-72" : "md:ml-16"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
