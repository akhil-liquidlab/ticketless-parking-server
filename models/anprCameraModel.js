const mongoose = require('mongoose');

const anprCameraSchema = new mongoose.Schema({
    camera_id: {
        type: String,
        required: true,
        unique: true
    },
    ip_address: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

const ANPRCamera = mongoose.model('ANPRCamera', anprCameraSchema);
module.exports = ANPRCamera; 