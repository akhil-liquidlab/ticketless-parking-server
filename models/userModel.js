const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Store hashed passwords
    email: { type: String, unique: true },
    role: { type: String, default: 'user' }, // e.g., admin, user
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

// Instance method to compare passwords
UserSchema.methods.comparePassword = async function (inputPassword) {
    console.log("Stored password (hashed):", this.password);  // Show the stored hashed password
    console.log("Input password:", inputPassword);  // Show the plaintext input password
    const isMatch = await bcrypt.compare(inputPassword, this.password);
    console.log("Password match result:", isMatch);  // Log the result of the comparison
    return isMatch;
};


module.exports = mongoose.model('User', UserSchema);
