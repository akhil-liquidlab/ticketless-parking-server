const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
require("dotenv").config();
const http = require("http");
const socketManager = require('./utils/socketManager');
const AxiosDigestAuth = require('@mhoc/axios-digest-auth').default;
const { parse } = require('multipart-mixed-parser');

const authRoutes = require("./routes/authRoutes");
const parkingRoutes = require("./routes/parkingRoutes");
const globalRoutes = require("./routes/globalRoutes");
const boothRoutes = require("./routes/boothRoutes");
const notificationRoutes = require("./routes/notification");
const Booth = require("./models/boothModel");

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

const port = process.env.PORT || 3000;

// Store connected sockets
const connectedSockets = new Map();

// Middleware
app.use(express.json({ limit: '50mb' }));  // For parsing application/json
app.use(express.urlencoded({ extended: true, limit: '50mb' }));  // For parsing application/x-www-form-urlencoded
app.use(cors());
app.use(helmet());

// Camera configuration
// const digestAuth = new AxiosDigestAuth({
//   username: process.env.CAMERA_USERNAME || "admin",
//   password: process.env.CAMERA_PASSWORD || "Liquidlab@1234",
// });

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    const io = socketManager.initialize(server);

    server.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// **Express Routes - Defined After MongoDB Connection**
app.use("/api/auth", authRoutes);
app.use("/api/parking", parkingRoutes);
app.use("/api/global", globalRoutes);
app.use("/api/booths", boothRoutes);
app.use("/NotificationInfo", notificationRoutes);

// Middleware to log every incoming request
app.get("/*", function (req, res, next) {
  console.log(req.url);
  next();
});

module.exports = app;