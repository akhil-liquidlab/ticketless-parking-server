const express = require('express');
const {
    validateVehicleEntry,
    validateVehicleExit,
    registerVehicle,
    updateVehicle,
    getAllRegisteredVehicles,
    getParkingHistory
} = require('../controllers/parkingController.js');
const authenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();

// Route to validate vehicle entry
router.post('/in/validate', authenticateToken, validateVehicleEntry);

// Route to validate vehicle exit
router.post('/out/validate', authenticateToken, validateVehicleExit);

// Route to register a new vehicle
router.post('/register', authenticateToken, registerVehicle);

// Route to update vehicle details
router.put('/vehicles', authenticateToken, updateVehicle);

// Route to get all registered vehicles
router.get('/vehicles', authenticateToken, getAllRegisteredVehicles);

// Route to get parking history
router.get('/history', authenticateToken, getParkingHistory);

module.exports = router;
