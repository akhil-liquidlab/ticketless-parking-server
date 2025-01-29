const express = require('express');
const { createClass, updateClass } = require('../controllers/classesController');
const authenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();

router.post('/create', authenticateToken, createClass);
router.put('/update', authenticateToken, updateClass);

module.exports = router;