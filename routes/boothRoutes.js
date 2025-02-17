const express = require('express');
const authenticateToken = require('../middlewares/authenticateToken');
const {
    createBooth,
    getAllBooths,
    updateBooth,
    updateDeviceSocketId,
    sendMessageToDevice,
    createDisplayDevice,
    createANPRCamera,
    createAndroidDevice,
    addDeviceToBooth
} = require('../controllers/boothController');
const Booth = require('../models/boothModel');

const router = express.Router();

// Create a new booth
router.post('/create', authenticateToken, createBooth);

// Get all booths
router.get('/', authenticateToken, getAllBooths);

// Create a new display device
router.post('/display-device', authenticateToken, createDisplayDevice);

// Create a new ANPR camera
router.post('/anpr-camera', authenticateToken, createANPRCamera);

// Create a new Android device
router.post('/android-device', authenticateToken, createAndroidDevice);

// Update booth details including devices
router.put('/:booth_code', authenticateToken, async (req, res) => {
    try {
        const booth = await Booth.findById(req.params.booth_code);
        if (!booth) {
            return res.status(404).json({ message: 'Booth not found' });
        }

        // Preserve socket_ids
        const updatedDevices = req.body.devices.map(newDevice => {
            const existingDevice = booth.devices.find(d => d.device_id === newDevice.device_id);
            if (existingDevice) {
                return {
                    ...newDevice,
                    socket_id: existingDevice.socket_id // Preserve existing socket_id
                };
            }
            return newDevice;
        });

        req.body.devices = updatedDevices;
        
        const updatedBooth = await Booth.findByIdAndUpdate(
            req.params.booth_code,
            req.body,
            { new: true }
        );

        res.json(updatedBooth);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update socket_id for a device in a booth (when the device connects)
router.put('/update-device-socket', authenticateToken, updateDeviceSocketId);

// Send a message to a specific device in a booth
router.post('/send-message', authenticateToken, sendMessageToDevice);

// Add devices to a booth
router.put('/:booth_code/add-devices', authenticateToken, addDeviceToBooth);

module.exports = router;
