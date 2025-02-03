const express = require('express');
const authenticateToken = require('../middlewares/authenticateToken');
const {
    createBooth,
    getAllBooths,
    updateBooth,
    updateDeviceSocketId,
    sendMessageToDevice
} = require('../controllers/boothController');

const router = express.Router();

// Create a new booth
router.post('/create', authenticateToken, createBooth);

// Get all booths
router.get('/', authenticateToken, getAllBooths);

// Update booth details including devices
router.put('/:booth_code', authenticateToken, updateBooth);

// Update socket_id for a device in a booth (when the device connects)
router.put('/update-device-socket', authenticateToken, updateDeviceSocketId);

// Send a message to a specific device in a booth
router.post('/send-message', authenticateToken, sendMessageToDevice);

module.exports = router;
