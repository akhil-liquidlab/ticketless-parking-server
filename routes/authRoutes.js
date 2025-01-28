const express = require('express');
const { login, protectedRoute } = require('../controllers/authController');
const authenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();

// Authentication routes
router.post('/login', login);
router.get('/protected', authenticateToken, protectedRoute);

module.exports = router;
