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
        required: function () { return this.status === 'active'; }, // Required only if class is active
        enum: ['monthly', 'yearly', 'weekly'], // Example enum values, adjust as needed
    },
    renewal_charge: {
        type: Number,
        required: function () { return this.status === 'active'; }, // Required only if class is active
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired', 'suspended', 'pending'], // Multiple possible status values
        default: 'inactive', // Default status is inactive
    },
    starting_date: {
        type: Date,
        required: function () { return this.status === 'active'; }, // Required only if class is active
    },
    ending_date: {
        type: Date,
        required: function () { return this.status === 'active'; }, // Required only if class is active
    },
    expiring_in: {
        type: Number,
        default: function () {
            // Calculate the difference between the current date and the ending date
            if (this.ending_date) {
                const currentDate = new Date();
                const expirationDate = new Date(this.ending_date);
                const timeDifference = expirationDate - currentDate;
                // Return the difference in days
                return Math.floor(timeDifference / (1000 * 3600 * 24));
            }
            return 0; // If ending_date is not set, return 0
        },
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
