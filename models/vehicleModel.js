const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    vehicle_no: {
        type: String,
        required: true,
        unique: true, // Ensures no duplicate registration numbers
    },
    vehicle_type: {
        type: String,
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
        required: true, // Class code for registered and unregistered vehicles
    },
    renewal_type: {
        type: String,
        required: true,
    },
    renewal_charge: {
        type: Number,
        required: true,
    },
    effective_from_date: {
        type: Date,
        required: true,
    },
    registration_status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'inactive', // Reflects the vehicle's registration status
    },
    starting_date: {
        type: Date,
        default: Date.now, // Timestamp when the vehicle enters the parking area
    },
    ending_date: {
        type: Date, // Timestamp when the vehicle exits
    },
    registration_expire_in: {
        type: Number, // Time left for registration expiration in seconds
    },
    status: {
        type: String,
        enum: ['parked', 'exited', 'pending'],
        default: 'pending', // Track vehicle entry status (parked or exited)
    },
    is_blacklisted: {
        type: Boolean,
        default: false, // Marks if the vehicle is blacklisted
    },
    parking_duration: {
        type: Number, // Total parking duration for the vehicle in seconds
        default: 0, // Will be updated when the vehicle exits
    },
    payment_status: {
        type: String,
        enum: ['paid', 'unpaid', 'free'],
        default: 'unpaid', // Payment status for unregistered vehicles (free for registered vehicles based on system settings)
    },
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;
