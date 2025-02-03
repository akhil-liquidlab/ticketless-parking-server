const express = require('express');
const authenticateToken = require('../middlewares/authenticateToken');
const {
    createBooth,
    getAllBooths,
    addDeviceToBooth,
    updateDeviceInBooth,
    updateDeviceSocketId,
    sendMessageToDevice,
    updateBooth
} = require('../controllers/boothController');

const router = express.Router();

// Create a new booth
router.post('/create', authenticateToken, createBooth);

// Get all booths
router.get('/', authenticateToken, getAllBooths);

// Add a device to a booth
router.post('/add-device', authenticateToken, addDeviceToBooth);

// Update a device in a booth
router.put('/update-device', authenticateToken, updateDeviceInBooth);

// Update socket_id for a device in a booth (when the device connects)
router.put('/update-device-socket', authenticateToken, updateDeviceSocketId);

// Send a message to a specific device in a booth
router.post('/send-message', authenticateToken, sendMessageToDevice);

// Add new route for updating booth
router.put('/:booth_code', authenticateToken, updateBooth);

module.exports = router;
