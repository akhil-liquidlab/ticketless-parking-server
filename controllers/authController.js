const User = require('../models/userModel.js');
const { generateToken } = require('../utils/jwtUtils.js');
const jwt = require('jsonwebtoken'); // Import JWT to verify tokens
const { SECRET_KEY } = require('../utils/jwtUtils');

// Login method
const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find the user in the database
        const user = await User.findOne({ username });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken({ userId: user._id, role: user.role });
        res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Register a new user
const registerUser = async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update user information
const updateUser = async (req, res) => {
    const { userId, username, password } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (username) user.username = username;
        if (password) user.password = await bcrypt.hash(password, 10);

        await user.save();
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get current user details
const getCurrentUserDetails = async (req, res) => {
    try {
        // Get the token from the request header
        const token = req.header('Authorization')?.replace('Bearer ', ''); // Assuming Bearer token
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        // Verify the token and decode the user information
        const decoded = jwt.verify(token, SECRET_KEY); // Replace with your JWT secret key
        const userId = decoded.userId; // Assuming the user ID is saved in the token

        // Fetch the current user's details from the database
        const user = await User.findById(userId).select('-password'); // Select all fields except password
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the user details
        res.json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching user details' });
    }
};

module.exports = { login, registerUser, updateUser, deleteUser, getCurrentUserDetails };
