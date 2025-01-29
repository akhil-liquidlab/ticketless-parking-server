const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../utils/jwtUtils');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Token required' });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });

        req.user = decoded; // Attach user info (e.g., userId, role) to the request
        next();
    });
};

module.exports = authenticateToken;
