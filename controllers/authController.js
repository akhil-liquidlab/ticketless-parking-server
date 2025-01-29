const User = require('../models/userModel.js');
const { generateToken } = require('../utils/jwtUtils.js');

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

module.exports = { login, registerUser, updateUser, deleteUser };
