const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
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
});

const GlobalData = mongoose.model('GlobalData', globalDataSchema);

module.exports = GlobalData;
