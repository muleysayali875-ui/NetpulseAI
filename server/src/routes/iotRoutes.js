const express = require("express");
const router = express.Router();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");

const JWT_SECRET = process.env.JWT_SECRET || "netpulse_secret_key";

// Helper: map integer congestion_level to status string
function getCongestionStatus(level) {
  if (level >= 70) return "High";
  if (level >= 30) return "Medium";
  return "Low";
}

// Shared logic: process sensor data, save to DB, and emit to the user's socket room
async function processSensorData(req, res, userId) {
  const { active_users, latency, throughput, packet_loss, signal_strength } = req.body;

  // 1. Get prediction from ML service
  let predicted_congestion = 0;
  let predicted_future_congestion = null;

  try {
    const mlResponse = await axios.post("http://localhost:8000/predict", {
      active_users: active_users || 0,
      latency: latency || 0,
      throughput: throughput || 0,
      packet_loss: packet_loss || 0,
      signal_strength: signal_strength || 0
    });
    predicted_congestion = mlResponse.data.congestion_level;
    predicted_congestion = predicted_congestion * 40 + 10;

    try {
      const forecastResponse = await axios.post("http://localhost:8000/predict/forecast", {
        active_users: active_users || 0,
        latency: latency || 0,
        throughput: throughput || 0,
        packet_loss: packet_loss || 0,
        signal_strength: signal_strength || 0
      });
      predicted_future_congestion = forecastResponse.data.future_congestion_level;
      predicted_future_congestion = predicted_future_congestion * 40 + 10;
    } catch (forecastError) {
      console.error("Forecast ML Service Error:", forecastError.message);
    }
  } catch (mlError) {
    console.error("ML Service Error:", mlError.message);
    predicted_congestion = Math.floor(Math.random() * 30);
  }

  // 2. Save to database — linked to this user
  const metric = await prisma.networkMetric.create({
    data: {
      userId,
      active_users: active_users || 0,
      latency: latency || 0.0,
      throughput: throughput || 0.0,
      congestion_level: predicted_congestion,
      future_congestion: predicted_future_congestion,
    }
  });

  // Build the payload
  const payload = {
    id: metric.id,
    active_users: metric.active_users,
    latency: metric.latency,
    throughput: metric.throughput,
    congestion_level: metric.congestion_level,
    future_congestion: metric.future_congestion,
    congestionStatus: getCongestionStatus(metric.congestion_level),
    futureCongestionStatus: metric.future_congestion !== null
      ? getCongestionStatus(metric.future_congestion)
      : null,
    timestamp: metric.timestamp,
    time: new Date(metric.timestamp).toLocaleTimeString([], {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    }),
  };

  // ✅ Emit ONLY to this user's private room
  const io = req.app.get("io");
  if (io) {
    io.to(`user:${userId}`).emit("new_metric", payload);
  }

  return payload;
}

// ─────────────────────────────────────────────────────────────
// POST /api/iot/data  — supports TWO authentication strategies:
//
//   1. JWT Bearer token  (dashboard / API calls)
//      → Authorization: Bearer <token>
//
//   2. userId in request body  (ESP32 / IoT devices that can't do JWT)
//      → { "userId": 2, "active_users": ..., ... }
//
// ─────────────────────────────────────────────────────────────
router.post("/data", async (req, res) => {
  try {
    let userId = null;

    // --- Strategy 1: Bearer JWT ---
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true },
        });
        if (user) userId = user.id;
      } catch (err) {
        return res.status(401).json({ status: "error", message: "Invalid token" });
      }
    }

    // --- Strategy 2: userId in body (ESP32 / IoT devices) ---
    if (!userId && req.body.userId) {
      const bodyUserId = parseInt(req.body.userId);
      const user = await prisma.user.findUnique({
        where: { id: bodyUserId },
        select: { id: true },
      });
      if (user) {
        userId = user.id;
      } else {
        return res.status(400).json({ status: "error", message: "Unknown userId" });
      }
    }

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: provide a Bearer token or a userId in the request body",
      });
    }

    console.log(`Incoming IoT Data from userId=${userId}:`, req.body);
    const payload = await processSensorData(req, res, userId);
    res.json({ status: "ok", data: payload });

  } catch (error) {
    console.error("Error saving IoT data:", error);
    res.status(500).json({ status: "error", message: "Failed to save data" });
  }
});

// ✅ Fetch recent metrics for the dashboard — scoped to the authenticated user
router.get("/metrics", authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const userId = req.user.id;

    const metrics = await prisma.networkMetric.findMany({
      where: { userId }, // ← only this user's data
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    // Reverse so oldest is first (for charts to render left-to-right)
    const formatted = metrics.reverse().map((m) => ({
      id: m.id,
      active_users: m.active_users,
      latency: m.latency,
      throughput: m.throughput,
      congestion_level: m.congestion_level,
      future_congestion: m.future_congestion,
      congestionStatus: getCongestionStatus(m.congestion_level),
      futureCongestionStatus: m.future_congestion !== null ? getCongestionStatus(m.future_congestion) : null,
      timestamp: m.timestamp,
      time: new Date(m.timestamp).toLocaleTimeString([], {
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
      }),
    }));

    res.json({ status: "ok", data: formatted });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch metrics" });
  }
});

// Optional test route
router.get("/data", (req, res) => {
  res.send("IoT route working");
});

module.exports = router;