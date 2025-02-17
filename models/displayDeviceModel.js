const mongoose = require('mongoose');

const displayDeviceSchema = new mongoose.Schema({
    device_id: {
        type: String,
        required: true,
        unique: true
    },
    socket_id: {
        type: String,
        default: null
    }
}, { timestamps: true });

const DisplayDevice = mongoose.model('DisplayDevice', displayDeviceSchema);
module.exports = DisplayDevice; 