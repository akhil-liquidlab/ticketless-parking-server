const express = require('express');
const { getGlobalInfo, updateGlobalData } = require('../controllers/globalController');
const authenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();

router.get('/data', authenticateToken, getGlobalInfo);
router.put('/data', authenticateToken, updateGlobalData);

module.exports = router;
