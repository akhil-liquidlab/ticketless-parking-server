const mongoose = require('mongoose');

const parkingHistorySchema = new mongoose.Schema({
    vehicle_no: { type: String, required: true },
    entry_time: { type: Date, default: Date.now },
    exit_time: { type: Date },
    total_parking_duration: { type: Number },
    payment_status: { type: Boolean, default: false },
});

module.exports = mongoose.model('ParkingHistory', parkingHistorySchema);
