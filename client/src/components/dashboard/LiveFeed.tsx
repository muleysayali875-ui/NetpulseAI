import React, { useEffect, useRef } from "react";
import { ActivityLog } from "../../hooks/useDashboardData";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

interface LiveFeedProps {
  logs: ActivityLog[];
  compact?: boolean;
}

export function LiveFeed({ logs, compact = false }: LiveFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Reversing the logs to show the newest at the top
  const displayLogs = [...logs].reverse();
  const visibleLogs = compact ? displayLogs.slice(0, 8) : displayLogs;

  // We no longer auto-scroll to the bottom because the newest is at the top
  // If we wanted to preserve scrolling behavior, we might auto-scroll to top instead
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-full bg-black/40">
      <div className="p-4 border-b border-border/50 flex justify-between items-center bg-card/30 rounded-t-2xl">
        <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-cyan flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan animate-pulse-dot" />
          Live Telemetry Stream
        </h3>
        {compact && (
          <Link 
            to="/telemetry" 
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-cyan transition-colors"
          >
            View All <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 scroll-smooth"
      >
        {visibleLogs.map((log) => {
          const isHigh = log.log.includes("HIGH");
          const isMedium = log.log.includes("MEDIUM");
          
          let highlightClass = "text-muted-foreground";
          if (isHigh) highlightClass = "text-destructive";
          else if (isMedium) highlightClass = "text-orange-400";

          return (
            <div key={log.id} className="flex gap-4 hover:bg-white/5 p-1 rounded transition-colors animate-in fade-in slide-in-from-top-1">
              <span className="text-muted-foreground/50 shrink-0">{log.timestamp}</span>
              <span className={highlightClass}>
                {log.log.split(', ').map((part, i) => {
                  const [key, val] = part.split('=');
                  return (
                    <React.Fragment key={i}>
                      <span className="text-foreground/70">{key}=</span>
                      <span className={key === 'congestion' ? 'font-bold' : 'text-cyan/80'}>{val}</span>
                      {i < 2 && <span className="text-muted-foreground/30">, </span>}
                    </React.Fragment>
                  );
                })}
              </span>
            </div>
          );
        })}
        {visibleLogs.length === 0 && (
          <div className="text-center text-muted-foreground/50 italic py-4">
            Waiting for incoming telemetry...
          </div>
        )}
      </div>
    </div>
  );
}
