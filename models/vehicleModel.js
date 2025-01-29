const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    vehicle_no: {
        type: String,
        required: true,
        unique: true, // Ensures no duplicate registration numbers
    },
    vehicle_type: {
        type: String,
        required: function () { return this.registration_status === 'active'; }, // Required only for registered vehicles
        default: null, // For unregistered vehicles, defaults to null
    },
    owner_first_name: {
        type: String,
        required: function () { return this.registration_status === 'active'; }, // Required only for registered vehicles
        default: null, // For unregistered vehicles, defaults to null
    },
    owner_last_name: {
        type: String,
        required: function () { return this.registration_status === 'active'; }, // Required only for registered vehicles
        default: null, // For unregistered vehicles, defaults to null
    },
    class_code: {
        type: String,
        required: true, // Class code for registered and unregistered vehicles
    },
    effective_from_date: {
        type: Date,
        required: true,
        default: function () {
            return this.registration_status === 'active' ? new Date() : new Date(); // Set to current date for both registered and unregistered vehicles
        },
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
        default: function () {
            return this.registration_status === 'active' ? 'unpaid' : 'free'; // Default to 'free' for unregistered vehicles
        },
    },
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;
