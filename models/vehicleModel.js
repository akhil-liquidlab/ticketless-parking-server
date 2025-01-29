const mongoose = require('mongoose');

// Define the vehicle schema
const vehicleSchema = new mongoose.Schema({
    vehicle_no: {
        type: String,
        required: true,
        unique: true, // Ensure the vehicle number is unique
    },
    vehicle_type: {
        type: Number,
        required: true,
    },
    owner_first_name: {
        type: String,
        required: true,
    },
    owner_last_name: {
        type: String,
        required: true,
    },
    class_code: {
        type: String,
        required: true,
    },
    renewal_type: {
        type: String,
        enum: ['monthly', 'weekly'], // Allow only 'monthly' or 'weekly'
        required: true,
    },
    renewal_charge: {
        type: Number,
        default: 0, // Default charge if not provided
    },
    effective_from_date: {
        type: Date,
        required: true,
    },
    registration_status: {
        type: String,
        enum: ['active', 'inactive', 'expired'], // Define the possible statuses
        required: true,
    },
    starting_date: {
        type: Date,
        required: true,
    },
    ending_date: {
        type: Date,
        required: true,
    },
    registration_expire_in: {
        type: Number, // Store the expiration time in seconds
        required: true,
    },
});

// Create a model from the schema
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;
