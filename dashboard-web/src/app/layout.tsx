import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Sensor Metrics Dashboard",
  description: "Dashboard for visualising sensor metrics and producer configuration"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen">
          <aside className="w-64 border-r bg-card/60 backdrop-blur-sm">
            <div className="px-6 py-4">
              <h1 className="text-lg font-semibold tracking-tight">
                Sensor Dashboard
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Local distributed metrics demo
              </p>
            </div>
            <nav className="mt-2 space-y-1 px-3 text-sm">
              <a
                href="/"
                className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Overview
              </a>
              <a
                href="/metrics"
                className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Metrics
              </a>
              <a
                href="/producer-config"
                className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Producer config
              </a>
            </nav>
          </aside>
          <main className="flex-1">
            <div className="container py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

