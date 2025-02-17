const mongoose = require('mongoose');

const boothSchema = new mongoose.Schema({
    booth_code: { type: String, required: true, unique: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    booth_type: { type: String, required: true, enum: ['entry', 'exit'] },
    status: { type: String, required: true, enum: ['active', 'inactive'], default: 'active' },
    displayDevices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DisplayDevice' // Reference to DisplayDevice
    }],
    cameraDevices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ANPRCamera' // Reference to ANPRCamera
    }],
    androidDevices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AndroidDevice' // Reference to AndroidDevice
    }]
}, { timestamps: true });

const Booth = mongoose.model('Booth', boothSchema);

module.exports = Booth;
