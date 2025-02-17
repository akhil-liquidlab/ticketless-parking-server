const mongoose = require('mongoose');

const androidDeviceSchema = new mongoose.Schema({
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

const AndroidDevice = mongoose.model('AndroidDevice', androidDeviceSchema);
module.exports = AndroidDevice; 