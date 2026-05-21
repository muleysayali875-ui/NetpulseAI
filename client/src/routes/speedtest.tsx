import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Gauge, ArrowLeft, RefreshCw, Activity, Share2, Download } from "lucide-react";
import axios from "axios";

export const Route = createFileRoute("/speedtest")({
  component: SpeedTestPage,
});

function SpeedTestPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "testing" | "completed" | "error">("idle");
  const [speed, setSpeed] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTest = async () => {
    setStatus("testing");
    setSpeed(null);
    setLatency(null);
    setError(null);

    try {
      // 1. Measure Latency (ping)
      const pingStart = performance.now();
      await fetch(`https://speed.cloudflare.com/__down?bytes=1&cachebuster=${Math.random()}`, { method: 'HEAD' });
      const pingEnd = performance.now();
      setLatency(Math.round(pingEnd - pingStart));

      // 2. Measure Download Speed (15MB payload)
      const downloadSize = 15000000; // 15MB
      const dlStart = performance.now();
      
      const response = await fetch(`https://speed.cloudflare.com/__down?bytes=${downloadSize}&cachebuster=${Math.random()}`);
      if (!response.ok) throw new Error("Network response was not ok");
      
      const reader = response.body?.getReader();
      if (reader) {
        while(true) {
          const {done} = await reader.read();
          if (done) break;
        }
      }
      
      const dlEnd = performance.now();
      const durationSeconds = (dlEnd - dlStart) / 1000;
      
      const bitsLoaded = downloadSize * 8;
      const speedMbps = (bitsLoaded / durationSeconds) / 1000000;
      
      setSpeed(parseFloat(speedMbps.toFixed(2)));
      setStatus("completed");
    } catch (err) {
      console.error("Speed test failed:", err);
      setError("Unable to connect to edge servers. Check your connection and try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-cyan/5 blur-[120px] pointer-events-none rounded-full" />
        
        <div className="max-w-3xl w-full">
          <button 
            onClick={() => navigate({ to: "/" })}
            className="relative z-50 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan transition-colors mb-8 font-mono uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="glass-panel p-8 md:p-16 rounded-[40px] border-cyan/20 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
             
             <AnimatePresence mode="wait">
               {status === "idle" && (
                 <motion.div
                   key="idle"
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 1.1 }}
                   className="space-y-8"
                 >
                   <div className="flex justify-center">
                     <div className="w-24 h-24 rounded-full bg-cyan/10 flex items-center justify-center text-cyan">
                        <Gauge className="w-12 h-12" />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <h1 className="text-4xl font-bold tracking-tight">NetPulse Speed Test</h1>
                     <p className="text-muted-foreground">Click the button below to measure your actual network throughput.</p>
                   </div>
                   <button
                     onClick={startTest}
                     className="px-12 py-4 rounded-full bg-cyan text-primary-foreground font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_-8px_var(--color-cyan)]"
                   >
                     START TEST
                   </button>
                 </motion.div>
               )}

               {status === "testing" && (
                 <motion.div
                   key="testing"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="space-y-12"
                 >
                   <div className="relative w-64 h-64 mx-auto">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-full h-full rounded-full border-4 border-dashed border-cyan/20"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <motion.div
                           animate={{ scale: [1, 1.1, 1] }}
                           transition={{ duration: 2, repeat: Infinity }}
                           className="text-5xl font-bold font-mono text-glow-cyan"
                         >
                           ...
                         </motion.div>
                         <span className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mt-2">Testing</span>
                      </div>
                   </div>
                   <p className="text-muted-foreground animate-pulse">Downloading test payload from edge servers...</p>
                 </motion.div>
               )}

               {status === "completed" && (
                 <motion.div
                   key="completed"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-10"
                 >
                   <div className="space-y-2">
                     <span className="text-xs font-mono uppercase tracking-[0.3em] text-cyan">Test Result</span>
                     <div className="flex items-baseline justify-center gap-3">
                       <h2 className="text-8xl font-bold tracking-tighter text-glow-cyan">{speed}</h2>
                       <span className="text-2xl font-mono text-muted-foreground uppercase">Mbps</span>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 pt-4 max-w-sm mx-auto">
                      <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
                         <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Latency (Ping)</div>
                         <div className="text-xl font-mono">{latency} ms</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
                         <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Server</div>
                         <div className="text-xl font-mono truncate text-xs mt-2">Cloudflare Edge</div>
                      </div>
                   </div>

                   <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                      <button 
                        onClick={startTest}
                        className="flex items-center gap-2 px-6 py-2 rounded-full border border-border hover:bg-secondary transition-colors text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                      </button>
                      <button className="flex items-center gap-2 px-6 py-2 rounded-full bg-cyan/10 text-cyan border border-cyan/20 hover:bg-cyan/20 transition-colors text-sm">
                        <Share2 className="w-4 h-4" />
                        Share Result
                      </button>
                   </div>
                 </motion.div>
               )}

               {status === "error" && (
                 <motion.div key="error" className="space-y-6">
                    <div className="w-20 h-20 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
                       <Activity className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold">Something went wrong</h2>
                    <p className="text-muted-foreground max-w-sm mx-auto">{error}</p>
                    <button
                      onClick={startTest}
                      className="px-8 py-2 rounded-full bg-destructive text-destructive-foreground font-semibold"
                    >
                      Try Again
                    </button>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
