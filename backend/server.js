import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import setupSocket from "./socket.js";
import cleanupOldMoments from "./utils/cleanupOldMoments.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Allow both origins
  methods: ['GET', 'POST', "PUT", "DELETE", "OPTIONS"],
  credentials: true, // Allow cookies/auth headers if needed
}));
app.options('*', cors());

// Serve static files from /uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
import messageRoutes from "./routes/messageRoutes.js";
app.use("/api/messages", messageRoutes);

const PORT = process.env.PORT || 5000;

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    setupSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};
cleanupOldMoments();

startServer();