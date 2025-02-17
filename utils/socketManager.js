const socketIo = require("socket.io");
const Booth = require('../models/boothModel');
const DisplayDevice = require('../models/displayDeviceModel');
const ANPRCamera = require('../models/anprCameraModel');
const AndroidDevice = require('../models/androidDeviceModel');
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

            socket.on("register_device", async (device_id, device_type) => {
                try {
                    let device;
                    if (device_type === 'display') {
                        device = await DisplayDevice.findOne({ device_id });
                    } else if (device_type === 'anpr') {
                        device = await ANPRCamera.findOne({ camera_id: device_id });
                    } else if (device_type === 'android') {
                        device = await AndroidDevice.findOne({ device_id });
                    }

                    if (!device) return;

                    device.socket_id = socket.id; // Update the socket_id
                    await device.save();
                    
                    socket.emit('registration_success', {
                        message: `${device_type.charAt(0).toUpperCase() + device_type.slice(1)} connected successfully`,
                        device_id: device.device_id,
                        socket_id: socket.id
                    });

                    console.log(`${device_type.charAt(0).toUpperCase() + device_type.slice(1)} ${device_id} registered with socket ${socket.id}`);
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
                console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
                // Clear socket_id for devices on disconnect
                try {
                    const displayDevice = await DisplayDevice.findOne({ socket_id: socket.id });
                    if (displayDevice) {
                        displayDevice.socket_id = null;
                        await displayDevice.save();
                        console.log(`Cleared socket_id for display device ${displayDevice.device_id}`);
                    }

                    const anprCamera = await ANPRCamera.findOne({ socket_id: socket.id });
                    if (anprCamera) {
                        anprCamera.socket_id = null;
                        await anprCamera.save();
                        console.log(`Cleared socket_id for ANPR camera ${anprCamera.camera_id}`);
                    }

                    const androidDevice = await AndroidDevice.findOne({ socket_id: socket.id });
                    if (androidDevice) {
                        androidDevice.socket_id = null;
                        await androidDevice.save();
                        console.log(`Cleared socket_id for Android device ${androidDevice.device_id}`);
                    }
                } catch (error) {
                    console.error('Error clearing socket_id on disconnect:', error);
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

    async emitToDevice(boothCode, deviceType, event, message) {
        try {
            // Find the booth by booth code
            const booth = await Booth.findOne({ booth_code: boothCode });
            if (!booth) {
                console.error(`Booth with code ${boothCode} not found`);
                return false;
            }

            let device;
            if (deviceType === 'display') {
                // Find the display device connected to the booth
                device = booth.displayDevices.length > 0 ? await DisplayDevice.findById(booth.displayDevices[0]) : null;
            } else if (deviceType === 'android') {
                // Find the Android device connected to the booth
                device = booth.androidDevices.length > 0 ? await AndroidDevice.findById(booth.androidDevices[0]) : null;
            }
            // console.log("device", deviceType, device);

            if (!device || !device.socket_id) {
                console.error(`Device not found or not connected for booth ${boothCode}`);
                return false;
            }

            console.log("Sending to", device.socket_id, event, message);
            this.io.to(device.socket_id).emit(event, message);
            return true;
        } catch (error) {
            console.error('Error emitting to device:', error);
            return false;
        }
    }
};

module.exports = socketManager; 