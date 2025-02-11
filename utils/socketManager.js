const socketIo = require("socket.io");
const Booth = require('../models/boothModel');
const messageQueue = require('./messageQueue');

const socketManager = {
    io: null,
    
    initialize: function(server) {
        if (!this.io) {
            this.io = socketIo(server, {
                cors: {
                    origin: "*",
                    methods: ["GET", "POST"],
                },
                transports: ["websocket", "polling"],
                pingTimeout: 300000,     // 5 minutes
                pingInterval: 100000, // 100 seconds
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                connectTimeout: 60000,  // 1 minute connection timeout
                maxHttpBufferSize: 1e8, // Increase buffer size
                allowEIO3: true,        // Allow Engine.IO 3 compatibility
                upgradeTimeout: 30000,  // 30 second upgrade timeout
                // keepaliveTimeout: 5000, // 10 seconds
                requestTimeout: 60000
            });

            this.setupSocketHandlers();
        }
        return this.io;
    },

    setupSocketHandlers: function() {
        this.io.on("connection", (socket) => {
            console.log(`Socket connected: ${socket.id}`);

            const keepAliveInterval = setInterval(() => {
                if (socket.connected) {
                    socket.emit('keep-alive', { timestamp: Date.now() });
                }
            }, 25000);

            socket.on("register_device", async (device_id) => {
                try {
                    const booth = await Booth.findOne({ "devices.device_id": device_id });
                    if (!booth) return;

                    const device = booth.devices.find(d => d.device_id === device_id);
                    if (!device) return;

                    device.socket_id = socket.id;
                    await booth.save();
                    
                    socket.emit('registration_success', {
                        message: "Device connected successfully",
                        booth_code: booth.booth_code,
                        socket_id: socket.id
                    });

                    console.log(`Device ${device_id} registered with socket ${socket.id}`);
                } catch (error) {
                    console.error('Error registering device:', error);
                }
            });

            socket.on("reconnect_attempt", () => {
                console.log(`Socket ${socket.id} attempting to reconnect`);
            });

            socket.on("reconnect", async () => {
                console.log(`Socket ${socket.id} reconnected`);
                
                try {
                    // Find the device using this socket ID
                    const booth = await Booth.findOne({ "devices.socket_id": socket.id });
                    if (booth) {
                        const device = booth.devices.find(d => d.socket_id === socket.id);
                        if (device) {
                            // Re-register the device
                            device.socket_id = socket.id;
                            await booth.save();
                            console.log(`Re-registered device ${device.device_id} after reconnect`);
                        }
                    }

                    // Process queued messages
                    const queuedMessages = messageQueue.getQueuedMessages(socket.id);
                    if (queuedMessages.length > 0) {
                        console.log(`Processing ${queuedMessages.length} queued messages for socket ${socket.id}`);
                        
                        queuedMessages.forEach(({ eventName, message }) => {
                            socket.emit(eventName, message);
                        });
                        
                        messageQueue.clearQueue(socket.id);
                    }
                } catch (error) {
                    console.error('Error handling reconnection:', error);
                }
            });

            socket.on("disconnect", async (reason) => {
                console.log(`Socket ${socket.id} disconnected temporarily. Reason: ${reason}`);
                console.log('Full disconnect details:', {
                    reason,
                    connected: socket.connected,
                    disconnected: socket.disconnected,
                    timestamp: new Date().toISOString()
                });
                clearInterval(keepAliveInterval);

                // List of temporary disconnect reasons that should not clear socket_id
                const temporaryDisconnects = [
                    'transport error',
                    'ping timeout',
                    'transport close',
                    'client namespace disconnect'
                ];

                if (temporaryDisconnects.includes(reason)) {
                    console.log(`Temporary disconnect, keeping socket_id for ${socket.id}`);
                    return;
                }

                // List of permanent disconnect reasons
                const permanentDisconnects = [
                    'client disconnect',
                    'server disconnect',
                    'forced close'
                ];

                if (permanentDisconnects.includes(reason) && socket.disconnected) {
                    try {
                        const booth = await Booth.findOne({ "devices.socket_id": socket.id });
                        if (booth) {
                            const device = booth.devices.find(d => d.socket_id === socket.id);
                            if (device) {
                                device.socket_id = null;
                                await booth.save();
                                console.log(`Cleared socket_id for device ${device.device_id} - permanent disconnect`);
                            }
                        }
                    } catch (error) {
                        console.error('Error clearing socket_id on disconnect:', error);
                    }

                    messageQueue.clearQueue(socket.id);
                }
            });

            socket.on("error", (error) => {
                console.error(`Socket ${socket.id} error:`, error);
            });

            socket.on("pong", () => {
                console.log(`Received pong from ${socket.id}`);
            });

            socket.on('keep-alive-response', () => {
                console.log(`Received keep-alive response from ${socket.id}`);
            });

            socket.on("connect_timeout", () => {
                console.log(`Socket ${socket.id} connection timeout`);
            });
        });

        this.io.on("connect_error", (error) => {
            console.error("Connection error:", error);
        });
    },

    getIO: function() {
        if (!this.io) throw new Error('Socket.IO not initialized');
        return this.io;
    },

    async findBoothByIdentifier(identifier) {
        if (!identifier) return null;
        
        return typeof identifier === 'string' 
            ? await Booth.findOne({
                $or: [
                    { 'devices.device_id': identifier },
                    { booth_code: { $regex: new RegExp(`^${identifier}$`, 'i') } }
                ]
            })
            : identifier;
    },

    async emitToDevice(deviceId, event, message) {
        try {
            const booth = await this.findBoothByIdentifier(deviceId);
            if (!booth) return false;

            const device = booth.devices.find(d => d.device_id === deviceId);
            if (!device?.socket_id) return false;
            console.log("sending to", device.socket_id, event, message);
            this.io.to(device.socket_id).emit(event, message);
            return true;
        } catch (error) {
            console.error('Error emitting to device:', error);
            return false;
        }
    }
};

module.exports = socketManager; 