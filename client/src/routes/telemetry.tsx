import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useDashboardData } from "@/hooks/useDashboardData";
import { LiveFeed } from "@/components/dashboard/LiveFeed";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/telemetry")({
  beforeLoad: () => {
    // Basic auth protection
    const token = localStorage.getItem("token");
    if (!token) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: TelemetryPage,
});

function TelemetryPage() {
  const { logs } = useDashboardData();

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans relative">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto p-6 grid-bg relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-cyan/5 blur-[120px] pointer-events-none rounded-full" />
        
        <div className="max-w-[1200px] mx-auto space-y-6 relative z-10 h-full flex flex-col">
          <header className="flex items-center gap-4">
            <Link 
              to="/dashboard"
              className="p-2 rounded-lg bg-card/30 border border-border/50 text-muted-foreground hover:text-cyan hover:border-cyan/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
                <span className="w-2 h-8 rounded-full bg-cyan shadow-[0_0_15px_rgba(0,255,255,0.5)]" />
                Full Telemetry Stream
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Live, unfiltered stream of all incoming sensor data.
              </p>
            </div>
          </header>

          <div className="flex-1 min-h-0 pb-6">
            <LiveFeed logs={logs} compact={false} />
          </div>
        </div>
      </main>
    </div>
  );
}
