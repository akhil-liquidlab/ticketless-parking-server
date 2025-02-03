const mongoose = require('mongoose');

// Class schema for registered vehicle classes
const classSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
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
        required: function () { return this.status === 'active'; },
        enum: ['monthly', 'yearly', 'weekly'],
    },
    renewal_charge: {
        type: Number,
        required: function () { return this.status === 'active'; },
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired', 'suspended', 'pending'],
        default: 'inactive',
    },
    starting_date: {
        type: Date,
        required: function () { return this.status === 'active'; },
    },
    ending_date: {
        type: Date,
        required: function () { return this.status === 'active'; },
    },
    expiring_in: {
        type: Number,
        default: function () {
            if (this.ending_date) {
                const currentDate = new Date();
                const expirationDate = new Date(this.ending_date);
                const timeDifference = expirationDate - currentDate;
                return Math.floor(timeDifference / (1000 * 3600 * 24));
            }
            return 0;
        },
    },
});

// Public slots schema
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

// Additional charges schema (for different vehicle types)
const additionalChargesSchema = new mongoose.Schema({
    interval_minutes: {
        type: Number,
        required: true,
    },
    amount_per_interval: {
        type: Number,
        required: true,
    },
});

// Global data schema for system-wide settings
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
    supported_classes: [classSchema], // Class schema for registered vehicles
    public_slots: publicSlotsSchema, // Public parking slots schema
    first_one_hour_charges: { // Fixed charge for the first hour based on vehicle type
        type: Map,
        of: Number, // Amount for each vehicle type
        required: true,
        default: {
            '2': 20, // 2-wheeler
            '3': 30, // 3-wheeler
            '4': 40, // 4-wheeler
        },
    },
    additional_charges: { // Dynamic charges based on vehicle type
        type: Map,
        of: additionalChargesSchema,
        required: true,
        default: {
            '2': { interval_minutes: 15, amount_per_interval: 10 }, // 2-wheeler example
            '3': { interval_minutes: 20, amount_per_interval: 15 }, // 3-wheeler example
            '4': { interval_minutes: 30, amount_per_interval: 20 }, // 4-wheeler example
        },
    },
});

// Create and export the global data model
const GlobalData = mongoose.model('GlobalData', globalDataSchema);

module.exports = GlobalData;