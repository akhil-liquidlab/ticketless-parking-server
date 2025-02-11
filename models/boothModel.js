const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        auto: true
    },
    device_id: {
        type: String,
        required: true
    },
    device_type: {
        type: String,
        required: true,
        enum: ['display', 'camera', 'barrier']
    },
    socket_id: {
        type: String,
        default: null
    }
}, { _id: false });

const boothSchema = new mongoose.Schema({
    booth_code: { type: String, required: true, unique: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    booth_type: { type: String, required: true, enum: ['entry', 'exit'] },  // Adding booth type
    status: { type: String, required: true, enum: ['active', 'inactive'], default: 'active' },  // Add status field
    devices: [deviceSchema]  // Devices as subdocuments
}, { timestamps: true });

const Booth = mongoose.model('Booth', boothSchema);

module.exports = Booth;
