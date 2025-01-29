const mongoose = require('mongoose');

const parkingSpaceSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    created_date: { type: Date, default: Date.now },
    total_capacity: { type: Number, required: true },
    slots_reserved: { type: Number, required: true, default: 0 },
    public_slots: { type: Number, required: true, default: 0 },
    slots_reservable: { type: Number, required: true, default: 0 },
    last_updated_date: { type: Date, default: Date.now },
});

const ParkingSpace = mongoose.model('ParkingSpace', parkingSpaceSchema);
module.exports = ParkingSpace;
