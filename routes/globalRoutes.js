const express = require('express');
const {
    getGlobalInfo,
    updateGlobalInfo,
} = require('../controllers/globalController'); // Controller for global info
const {
    updateClassData,
    addClassData,
    deleteClassData,
} = require('../controllers/classController.js'); // Controller for class-specific operations

const authenticateToken = require('../middlewares/authenticateToken'); // Middleware for authentication

const router = express.Router();

// Route to get global information
router.get('/', authenticateToken, getGlobalInfo);

// Route to update global info (except classes and public slots)
router.put('/', authenticateToken, updateGlobalInfo);

// Routes for class-specific operations
router.put('/classes', authenticateToken, updateClassData); // Update class info
router.post('/classes', authenticateToken, addClassData); // Add a new class
router.delete('/classes/:code', authenticateToken, deleteClassData); // Delete a class by code

module.exports = router;
