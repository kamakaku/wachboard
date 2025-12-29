import { APP_NAME } from "@/lib/constants";
import Link from "next/link";
import { UserNav } from "@/components/user-nav";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { MuiThemeWrapper } from "@/components/mui/theme-wrapper";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <MuiThemeWrapper>
      <Box component="div" sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <AppBar component="header" position="static" color="inherit" elevation={1}>
          <Toolbar sx={{ gap: 3 }}>
            <Link href="/app" className="flex items-center text-inherit">
              <Typography variant="h6" component="span" fontWeight="bold">
                {APP_NAME}
              </Typography>
            </Link>
            <Box sx={{ flexGrow: 1 }} />
            <Box component="nav">
              <Suspense fallback={<div>Loading...</div>}>
                <UserNav />
              </Suspense>
            </Box>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ flex: 1, width: '100%', overflow: 'auto' }}>
          {children}
        </Box>
        <Toaster />
      </Box>
    </MuiThemeWrapper>
  );
}
