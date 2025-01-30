const jwt = require('jsonwebtoken');

// Secret key
const SECRET_KEY = process.env.SECRET_KEY; // Use environment variables in production

// Generate JWT token
const generateToken = (payload) => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
};

module.exports = {
    generateToken,
    SECRET_KEY,
};
