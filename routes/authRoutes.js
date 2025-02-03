const express = require('express');
const { login, registerUser, updateUser, deleteUser, getCurrentUserDetails } = require('../controllers/authController');
const authenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticateToken, getCurrentUserDetails);
router.post('/register', authenticateToken, registerUser);
router.put('/update', authenticateToken, updateUser);
router.delete('/delete', authenticateToken, deleteUser);

module.exports = router;
