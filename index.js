const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
require("dotenv").config();
const http = require("http");
const socketIo = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const parkingRoutes = require("./routes/parkingRoutes");
const globalRoutes = require("./routes/globalRoutes");
const boothRoutes = require("./routes/boothRoutes");
const Booth = require("./models/boothModel");

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"], // Ensure WebSockets are supported
});

const port = process.env.PORT || 3000;

// Store connected sockets
const connectedSockets = new Map();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// Ensure `io` is globally available
app.locals.io = io;

// **MongoDB Connection**
const clearAllSocketIds = async () => {
  try {
    const result = await Booth.updateMany(
      { "devices.socket_id": { $ne: null } },
      { $set: { "devices.$[].socket_id": null } }
    );
    if (result.modifiedCount > 0) {
      console.log(`🧹 Cleared socket IDs from ${result.modifiedCount} booths during server startup`);
    }
  } catch (error) {
    console.error("Error clearing socket IDs during startup:", error);
  }
};

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    // Clear all socket IDs on server startup
    await clearAllSocketIds();

    // **Setup Socket.IO Connection After MongoDB Connection**
    io.on("connection", (socket) => {
      console.log(`A user connected with socket id: ${socket.id}`);

      // Handle device registration
      socket.on("register_device", async (device_id) => {
        try {
          const booth = await Booth.findOne({
            "devices.device_id": device_id,
          });

          if (!booth) {
            console.log(`❌ No booth found for device: ${device_id}`);
            return socket.emit("unauthorized", {
              message: "Device not registered to any booth",
            });
          }

          // Find the specific device in the booth
          const device = booth.devices.find((dev) => dev.device_id === device_id);

          if (!device) {
            console.log(`❌ Device not found: ${device_id}`);
            return socket.emit("unauthorized", {
              message: "Device not registered",
            });
          }

          // Update device's socket_id
          device.socket_id = socket.id;
          await booth.save();

          console.log(`✅ Device ${device_id} connected with socket: ${socket.id} in booth: ${booth.booth_code}`);

          // Send success response with booth info
          socket.emit("registration_success", {
            message: "Device connected successfully",
            booth_code: booth.booth_code,
            booth_type: booth.booth_type,
            device_type: device.device_type,
          });
        } catch (error) {
          console.error("Error during device registration:", error);
          socket.emit("error", { message: "Error during registration" });
        }
      });

      // Handle disconnection of socket
      socket.on("disconnect", async () => {
        console.log(`🔌 User with socket id ${socket.id} disconnected`);

        try {
          const result = await Booth.updateMany(
            { "devices.socket_id": socket.id },
            { $set: { "devices.$.socket_id": null } }
          );

          if (result.modifiedCount > 0) {
            console.log(`ℹ️ Cleared socket_id ${socket.id} from ${result.modifiedCount} devices`);
          }
        } catch (error) {
          console.error("Error clearing socket_id on disconnect:", error);
        }
      });
    });

    // **Start the Server After MongoDB is Connected**
    server.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });

    // **Periodic Cleanup of Stale Socket Connections**
    setInterval(async () => {
      try {
        const booths = await Booth.find({ "devices.socket_id": { $ne: null } });
        for (const booth of booths) {
          for (const device of booth.devices) {
            if (device.socket_id && !io.sockets.sockets.has(device.socket_id)) {
              console.log(`🧹 Cleaning up stale socket connection for device ${device.device_id}`);
              device.socket_id = null;
            }
          }
          await booth.save();
        }
      } catch (error) {
        console.error("Error in periodic connection check:", error);
      }
    }, 60000); // Check every minute
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// **Express Routes - Defined After MongoDB Connection**
app.use("/ticketless/api/auth", authRoutes);
app.use("/ticketless/api/parking", parkingRoutes);
app.use("/ticketless/api/global", globalRoutes);
app.use("/ticketless/api/booths", boothRoutes);

// Middleware to log every incoming request
app.get("/*", function (req, res, next) {
  console.log(req.url);
  next();
});