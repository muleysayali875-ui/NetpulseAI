const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const utilRoutes = require("./routes/utilRoutes");
const iotRoutes = require("./routes/iotRoutes");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow all origins for now
    methods: ["GET", "POST"]
  }
});

// Make io accessible to our router
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Client connected via WebSocket:", socket.id);

  // Client sends their userId so we can put them in a private room
  socket.on("join_user_room", (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined room user:${userId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/utils", utilRoutes);
app.use("/api/iot", iotRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: "Something went wrong on the server",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});
