import { createFileRoute, redirect } from "@tanstack/react-router";
import { useDashboardData } from "@/hooks/useDashboardData";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LatencyChart, ThroughputLatencyChart, ActiveUsersChart, CongestionHistoryChart } from "@/components/dashboard/Charts";
import { AIInsights } from "@/components/dashboard/AIInsights";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { LiveFeed } from "@/components/dashboard/LiveFeed";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Activity, Network, Users, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    // Basic auth protection - check if token exists
    const token = localStorage.getItem("token");
    if (!token) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { metrics, latestMetric, alerts, logs, modelStatus, apiStatus, lastPredictionTime } = useDashboardData();

  if (!latestMetric) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 rounded-full bg-cyan animate-pulse-dot mx-auto" />
          <p className="text-muted-foreground text-sm font-mono">Waiting for IoT data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans relative">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto p-6 grid-bg relative">
        {/* Background ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-cyan/5 blur-[120px] pointer-events-none rounded-full" />
        
        <div className="max-w-[1600px] mx-auto space-y-6 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
              <span className="w-2 h-8 rounded-full bg-cyan shadow-[0_0_15px_rgba(0,255,255,0.5)]" />
              Network Intelligence Console
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time traffic congestion monitoring and prediction.</p>
          </div>
          
          <SystemStatus 
            modelStatus={modelStatus}
            apiStatus={apiStatus}
            lastPredictionTime={lastPredictionTime}
          />
        </header>

        {/* 1. Top Summary Cards (KPI Section) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Latency"
            value={latestMetric.latency.toFixed(0)}
            unit="ms"
            icon={Activity}
            status={latestMetric.latency > 100 ? "critical" : latestMetric.latency > 60 ? "warning" : "good"}
            glow={latestMetric.latency > 60}
          />
          <MetricCard
            title="Active Users"
            value={latestMetric.active_users}
            icon={Users}
            status={latestMetric.active_users > 80 ? "critical" : latestMetric.active_users > 50 ? "warning" : "good"}
            glow={latestMetric.active_users > 50}
          />
          <MetricCard
            title="Throughput"
            value={latestMetric.throughput.toFixed(1)}
            unit="Mbps"
            icon={Network}
          />
          <MetricCard
            title="Current Congestion"
            value={latestMetric.congestionStatus}
            icon={AlertTriangle}
            status={latestMetric.congestionStatus === "High" ? "critical" : latestMetric.congestionStatus === "Medium" ? "warning" : "good"}
            glow={latestMetric.congestionStatus !== "Low"}
          />
          <MetricCard
            title="Future Forecast"
            value={latestMetric.futureCongestionStatus || "Pending"}
            icon={AlertTriangle}
            status={latestMetric.futureCongestionStatus === "High" ? "critical" : latestMetric.futureCongestionStatus === "Medium" ? "warning" : "good"}
            glow={latestMetric.futureCongestionStatus === "High" || latestMetric.futureCongestionStatus === "Medium"}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (Charts - takes up 8 columns) */}
          <div className="lg:col-span-8 space-y-6">
            <LatencyChart data={metrics} />
            <ThroughputLatencyChart data={metrics} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ActiveUsersChart data={metrics} />
              <CongestionHistoryChart data={metrics} />
            </div>
          </div>

          {/* Right Column (Insights, Alerts, Feed - takes up 4 columns) */}
          <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
            <div className="h-64 shrink-0">
              <AIInsights congestionStatus={latestMetric.congestionStatus} latency={latestMetric.latency} />
            </div>
            
            <div className="h-48 shrink-0">
              <AlertsPanel alerts={alerts} />
            </div>
            
            <div className="flex-1 min-h-[200px]">
              <LiveFeed logs={logs} compact={true} />
            </div>
          </div>
          
        </div>
        </div>
      </main>
    </div>
  );
}
