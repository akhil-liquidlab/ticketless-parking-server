const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
require('dotenv').config();
const http = require('http');  // Import http module
const socketIo = require('socket.io');  // Import Socket.IO

const authRoutes = require('./routes/authRoutes');
const parkingRoutes = require('./routes/parkingRoutes');
const globalRoutes = require('./routes/globalRoutes');
const boothRoutes = require('./routes/boothRoutes'); // Import boothRoutes
const Booth = require('./models/boothModel');  // Import Booth model

const app = express();
const server = http.createServer(app);  // Create HTTP server using Express app
const io = socketIo(server);  // Initialize Socket.IO with the server

const port = process.env.PORT || 3000;

const connectedSockets = new Map();

app.locals.io = io;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/global', globalRoutes);
app.use('/api/booths', boothRoutes); // Register boothRoutes

// Socket.IO connection event
io.on('connection', (socket) => {
    console.log(`A user connected with socket id: ${socket.id}`);

    // Handle device registration
    socket.on('register_device', async (device_id, booth_code) => {

        try {
            // Find booth by booth_code
            const booth = await Booth.findOne({ booth_code });

            if (!booth) {
                console.log(`Booth not found for code: ${booth_code}`);
                return socket.emit('unauthorized', { message: 'Booth not found' });
            }

            // Check if the device exists in the booth's devices array
            const device = booth.devices.find(dev => dev.device_id === device_id);

            if (!device) {
                console.log(`Device not found for ID: ${device_id} in booth: ${booth_code}`);
                return socket.emit('unauthorized', { message: 'Device not registered' });
            }

            // If device is found, update its socket_id
            device.socket_id = socket.id;
            await booth.save();

            console.log(`✅ Device ${device_id} connected with socket: ${socket.id}`);

            socket.emit('registration_success', { message: 'Device connected successfully' });
        } catch (error) {
            console.error('Error during device registration:', error);
            socket.emit('error', { message: 'Error during registration' });
        }
    });

    // Handle disconnection of socket
    socket.on('disconnect', async () => {
        console.log(`🔌 User with socket id ${socket.id} disconnected`);

        try {
            // Efficient disconnect handling by directly updating the socket_id in Booth
            const booths = await Booth.find({ 'devices.socket_id': socket.id });

            for (const booth of booths) {
                const device = booth.devices.find(dev => dev.socket_id === socket.id);
                if (device) {
                    device.socket_id = null; // Clear socket_id on disconnect
                    await booth.save();
                    console.log(`ℹ️ Cleared socket_id for device ${device.device_id} in booth ${booth.booth_code}`);
                    break;
                }
            }
        } catch (error) {
            console.error('Error clearing socket_id on disconnect:', error);
        }
    });
});

// Start server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
