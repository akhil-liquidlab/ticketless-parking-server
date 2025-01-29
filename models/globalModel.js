const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true, // Ensure the class code is unique
    },
    name: {
        type: String,
        required: true,
    },
    slots_reserved: {
        type: Number,
        required: true,
    },
    slots_used: {
        type: Number,
        required: true,
    },
    renewal_type: {
        type: String,
        required: true, // Assuming renewal type is mandatory for the class
        enum: ['monthly', 'yearly', 'weekly'], // Example enum values, adjust as needed
    },
    renewal_charge: {
        type: Number,
        required: true, // Assuming renewal charge is mandatory for the class
    },
});

const publicSlotsSchema = new mongoose.Schema({
    total: {
        type: Number,
        required: true,
    },
    occupied: {
        type: Number,
        required: true,
    },
    available: {
        type: Number,
        required: true,
    },
});

const globalDataSchema = new mongoose.Schema({
    total_parking_slots: {
        type: Number,
        required: true,
    },
    occupied_slots: {
        type: Number,
        required: true,
    },
    available_slots: {
        type: Number,
        required: true,
    },
    total_registered_users: {
        type: Number,
        required: true,
    },
    system_uptime: {
        type: String,
        required: true,
    },
    last_maintenance_date: {
        type: Date,
        required: true,
    },
    supported_classes: [classSchema],
    public_slots: publicSlotsSchema,
    amount_per_minute: { // New field added to calculate tariff
        type: Number,
        required: true, // This is required to calculate the parking fee
    },
});

const GlobalData = mongoose.model('GlobalData', globalDataSchema);

module.exports = GlobalData;
