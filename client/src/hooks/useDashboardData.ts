import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface MetricData {
  time: string;
  latency: number;
  throughput: number;
  active_users: number;
  congestion_level: number;
  future_congestion?: number | null;
  congestionStatus: "Low" | "Medium" | "High";
  futureCongestionStatus?: "Low" | "Medium" | "High" | null;
}

export interface Alert {
  id: string;
  message: string;
  type: "critical" | "warning" | "info";
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  log: string;
  timestamp: string;
}

/** Returns the current user's id from localStorage, or null if not logged in. */
function getCurrentUserId(): number | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

/** Returns the current user's JWT from localStorage. */
function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

export function useDashboardData() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [latestMetric, setLatestMetric] = useState<MetricData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [modelStatus, setModelStatus] = useState<"Active" | "Idle">("Idle");
  const [apiStatus, setApiStatus] = useState<"Online" | "Offline">("Offline");
  const [lastPredictionTime, setLastPredictionTime] = useState<string>("");
  const socketRef = useRef<Socket | null>(null);

  // Process an incoming metric (from both initial fetch and WebSocket)
  const processMetric = (metric: MetricData) => {
    setMetrics((prev) => {
      const updated = [...prev, metric];
      if (updated.length > 30) updated.shift(); // Keep last 30 data points
      return updated;
    });

    setLatestMetric(metric);
    setLastPredictionTime(metric.time);
    setApiStatus("Online");
    setModelStatus("Active");

    // Generate activity log
    const futureLog = metric.futureCongestionStatus ? ` | Forecast=${metric.futureCongestionStatus.toUpperCase()}` : '';
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      log: `users=${metric.active_users}, latency=${metric.latency.toFixed(0)}ms, throughput=${metric.throughput.toFixed(1)}Mbps, congestion=${metric.congestionStatus.toUpperCase()}${futureLog}`,
      timestamp: metric.time,
    };
    setLogs((prev) => [...prev.slice(-499), newLog]);

    // Generate alerts based on thresholds
    if (metric.congestionStatus === "High") {
      const newAlert: Alert = {
        id: Date.now().toString(),
        message: `⚠ High congestion detected (latency: ${metric.latency.toFixed(0)}ms)`,
        type: "critical",
        timestamp: metric.time,
      };
      setAlerts((prev) => [newAlert, ...prev].slice(0, 5));
    } else if (metric.congestionStatus === "Medium" && metric.latency > 60) {
      const newAlert: Alert = {
        id: Date.now().toString(),
        message: `📉 Network congestion rising (latency: ${metric.latency.toFixed(0)}ms)`,
        type: "warning",
        timestamp: metric.time,
      };
      setAlerts((prev) => [newAlert, ...prev].slice(0, 5));
    }
  };

  // 1) Fetch THIS USER'S historical data on mount (authenticated request)
  useEffect(() => {
    const fetchHistory = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const response = await axios.get(`${API_URL}/api/iot/metrics?limit=30`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data?.data) {
          const history: MetricData[] = response.data.data;
          setMetrics(history);
          if (history.length > 0) {
            const latest = history[history.length - 1];
            setLatestMetric(latest);
            setLastPredictionTime(latest.time);
            setApiStatus("Online");
            setModelStatus("Active");

            setAlerts([
              {
                id: "init",
                message: "System initialized. Monitoring active.",
                type: "info",
                timestamp: new Date().toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }),
              },
            ]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch historical metrics:", error);
        setApiStatus("Offline");
      }
    };

    fetchHistory();
  }, []);

  // 2) Connect to WebSocket and join THIS USER'S private room
  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected:", socket.id);
      setApiStatus("Online");

      // ✅ Join this user's private room so we only receive our own metrics
      const userId = getCurrentUserId();
      if (userId) {
        socket.emit("join_user_room", userId);
        console.log("Joined private room for user:", userId);
      }
    });

    socket.on("new_metric", (data: MetricData) => {
      console.log("Received new metric via WebSocket:", data);
      processMetric(data);
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setApiStatus("Offline");
      setModelStatus("Idle");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    metrics,
    latestMetric,
    alerts,
    logs,
    modelStatus,
    apiStatus,
    lastPredictionTime,
  };
}
