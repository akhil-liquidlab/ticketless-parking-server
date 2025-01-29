const mongoose = require('mongoose');

const parkingHistorySchema = new mongoose.Schema({
    vehicle_no: { type: String, required: true },
    class_code: { type: String, required: true },
    entry_time: { type: Date, required: true },
    exit_time: { type: Date, required: true },
    parking_duration: { type: Number, required: true },  // in seconds
    tariff: {
        gst: { type: Number, required: true },
        total_amount: { type: Number, required: true },
        discount_amount: { type: Number, required: true },
        discount_percentage: { type: Number, required: true },
        amount_payable: { type: Number, required: true },
    },
});

const ParkingHistory = mongoose.model('ParkingHistory', parkingHistorySchema);

module.exports = ParkingHistory;
