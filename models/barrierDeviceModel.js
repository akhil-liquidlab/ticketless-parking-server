const mongoose = require('mongoose');

const barrierDeviceSchema = new mongoose.Schema({
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

const BarrierDevice = mongoose.model('BarrierDevice', barrierDeviceSchema);
module.exports = BarrierDevice; 