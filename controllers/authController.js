const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwtUtils');
const users = require('../models/userModel');

// Login controller
const login = async (req, res) => {
    const { username, password } = req.body;

    // Find user
    const user = users.find((u) => u.username === username);
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = generateToken({ userId: user.id });
    res.json({ token });
};

// Protected route controller
const protectedRoute = (req, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
};

module.exports = {
    login,
    protectedRoute,
};
