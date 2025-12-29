// The app routes don't need a special layout for now.
// The main layout in /app/(main)/layout.tsx is sufficient.
// This file can just pass children through.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
