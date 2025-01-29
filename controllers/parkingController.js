const Vehicle = require('../models/vehicleModel.js');
const ParkingSpace = require('../models/parkingSpaceModel');
const { handleSuccess, handleError } = require('../utils/responseUtils.js');
const moment = require('moment');

// Register a new vehicle
const registerVehicle = async (req, res) => {
    const {
        vehicle_no,
        vehicle_type,
        owner_first_name,
        owner_last_name,
        class_code,
        renewal_type,
        renewal_charge,
        effective_from_date,
        registration_status,
    } = req.body;

    try {
        // Validate required fields
        if (!vehicle_no || !vehicle_type || !owner_first_name || !owner_last_name || !class_code || !renewal_type || !renewal_charge || !effective_from_date || !registration_status) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check for duplicate vehicle registration number
        const existingVehicle = await Vehicle.findOne({ vehicle_no });
        if (existingVehicle) {
            return res.status(409).json({ message: `Vehicle with registration number ${vehicle_no} already exists` });
        }

        // Create the vehicle entry
        const newVehicle = new Vehicle({
            vehicle_no,
            vehicle_type,
            owner_first_name,
            owner_last_name,
            class_code,
            renewal_type,
            renewal_charge,
            effective_from_date,
            registration_status,
            starting_date: new Date(),
            ending_date: calculateEndingDate(renewal_type, effective_from_date),
            registration_expire_in: calculateExpirationInSeconds(effective_from_date, renewal_type),
        });

        // Save the vehicle to the database
        await newVehicle.save();

        // Return the full vehicle details in the response
        res.status(201).json({
            registration_id: newVehicle._id,
            vehicle_no: newVehicle.vehicle_no,
            vehicle_type: newVehicle.vehicle_type,
            owner_first_name: newVehicle.owner_first_name,
            owner_last_name: newVehicle.owner_last_name,
            class_code: newVehicle.class_code,
            renewal_type: newVehicle.renewal_type,
            renewal_charge: newVehicle.renewal_charge,
            effective_from_date: newVehicle.effective_from_date,
            registration_status: newVehicle.registration_status,
            starting_date: newVehicle.starting_date,
            ending_date: newVehicle.ending_date,
            registration_expire_in: newVehicle.registration_expire_in,
        });
    } catch (error) {
        console.error(error);

        // Check for duplicate key errors from MongoDB (Mongoose-specific error)
        if (error.code === 11000) {
            return res.status(409).json({
                message: `Vehicle with registration number ${error.keyValue.vehicle_no} already exists`,
            });
        }

        // Handle other errors
        res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
};

// Update an existing vehicle's registration
const updateVehicle = async (req, res) => {
    const { registration_id } = req.params;
    const {
        vehicle_no,
        vehicle_type,
        owner_first_name,
        owner_last_name,
        class_code,
        renewal_type,
        renewal_charge,
        effective_from_date,
        registration_status,
    } = req.body;

    try {
        // Validate that registration_id is provided
        if (!registration_id) {
            return res.status(400).json({ message: 'Registration ID is required' });
        }

        // Find the vehicle by registration_id
        const vehicle = await Vehicle.findById(registration_id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found with the provided registration ID' });
        }

        // Prepare fields to be updated
        const updatedFields = {};

        if (vehicle_no) updatedFields.vehicle_no = vehicle_no;
        if (vehicle_type) updatedFields.vehicle_type = vehicle_type;
        if (owner_first_name) updatedFields.owner_first_name = owner_first_name;
        if (owner_last_name) updatedFields.owner_last_name = owner_last_name;
        if (class_code) updatedFields.class_code = class_code;
        if (renewal_type) updatedFields.renewal_type = renewal_type;
        if (renewal_charge) updatedFields.renewal_charge = renewal_charge;
        if (effective_from_date) updatedFields.effective_from_date = effective_from_date;
        if (registration_status) updatedFields.registration_status = registration_status;

        // If renewal_type or effective_from_date is provided, update the ending date and expiration time
        if (renewal_type || effective_from_date) {
            updatedFields.ending_date = calculateEndingDate(renewal_type || vehicle.renewal_type, effective_from_date || vehicle.effective_from_date);
            updatedFields.registration_expire_in = calculateExpirationInSeconds(effective_from_date || vehicle.effective_from_date, renewal_type || vehicle.renewal_type);
        }

        // Update the vehicle
        await Vehicle.findByIdAndUpdate(registration_id, updatedFields, { new: true });

        // Return updated vehicle data
        const updatedVehicle = await Vehicle.findById(registration_id);

        res.json({
            registration_id: updatedVehicle._id,
            vehicle_no: updatedVehicle.vehicle_no,
            vehicle_type: updatedVehicle.vehicle_type,
            owner_first_name: updatedVehicle.owner_first_name,
            owner_last_name: updatedVehicle.owner_last_name,
            class_code: updatedVehicle.class_code,
            renewal_type: updatedVehicle.renewal_type,
            renewal_charge: updatedVehicle.renewal_charge,
            effective_from_date: updatedVehicle.effective_from_date,
            registration_status: updatedVehicle.registration_status,
            starting_date: updatedVehicle.starting_date,
            ending_date: updatedVehicle.ending_date,
            registration_expire_in: updatedVehicle.registration_expire_in,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
};

// Helper function to calculate the ending date
const calculateEndingDate = (renewal_type, effective_from_date) => {
    const startDate = new Date(effective_from_date);
    let endDate;

    try {
        if (renewal_type === 'monthly') {
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
        } else if (renewal_type === 'weekly') {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 7);
        } else {
            throw new Error('Invalid renewal type. It should be either "monthly" or "weekly"');
        }

        return endDate;
    } catch (error) {
        throw new Error('Error calculating the ending date: ' + error.message);
    }
};

// Helper function to calculate expiration time
const calculateExpirationInSeconds = (effective_from_date, renewal_type) => {
    try {
        const startDate = new Date(effective_from_date);
        const endDate = calculateEndingDate(renewal_type, effective_from_date);
        return Math.floor((endDate - startDate) / 1000);
    } catch (error) {
        throw new Error('Error calculating expiration time: ' + error.message);
    }
};

// Validate vehicle entry
const validateVehicleEntry = async (req, res) => {
    const { vehicle_no } = req.body;

    try {
        // Retrieve parking space data
        const parkingSpace = await ParkingSpace.findOne({ code: 'main-prking-space' });

        if (!parkingSpace) {
            return res.status(500).json({
                message: 'Parking space data not found.',
            });
        }

        // Check if vehicle is registered
        const vehicle = await Vehicle.findOne({ vehicle_no });

        if (!vehicle) {
            if (parkingSpace.public_slots <= 0) {
                return res.status(403).json({
                    message: 'No available slots for unregistered vehicles.',
                    barrier_status: 'closed',
                    is_registered_vehicle: false,
                });
            }

            parkingSpace.public_slots -= 1;
            await parkingSpace.save();

            return res.json({
                message: 'Unregistered vehicle allowed entry',
                is_registered_vehicle: false,
                registration_status: 'unregistered',
                barrier_status: 'open',
                entry_time: new Date().toISOString(),
            });
        }

        if (vehicle.is_blacklisted) {
            return res.status(403).json({
                message: 'Vehicle is blacklisted',
                barrier_status: 'closed',
                is_registered_vehicle: true,
            });
        }

        const currentDate = new Date();
        const expirationDate = calculateEndingDate(vehicle.renewal_type, vehicle.effective_from_date);

        if (currentDate > expirationDate) {
            return res.status(400).json({
                message: 'Vehicle registration has expired',
                expiration_date: expirationDate.toISOString(),
            });
        }

        res.json({
            message: 'Vehicle validated successfully',
            is_registered_vehicle: true,
            registration_status: 'active',
            barrier_status: 'open',
            entry_time: new Date().toISOString(),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete Vehicle
const deleteVehicle = async (req, res) => {
    const { registration_id } = req.params;

    try {
        if (!registration_id) {
            return res.status(400).json({ message: 'Registration ID is required' });
        }

        const vehicle = await Vehicle.findById(registration_id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        await Vehicle.findByIdAndDelete(registration_id);
        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
};

// Get all registered vehicles
const getAllRegisteredVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ registration_status: 'active' });

        if (vehicles.length === 0) {
            return res.status(404).json({ message: 'No active vehicles found' });
        }

        res.json({ vehicles });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching vehicles' });
    }
};

// Validate vehicle exit (add this method)
const validateVehicleExit = async (req, res) => {
    const { vehicle_no, is_paid } = req.body;

    try {
        const vehicle = await Vehicle.findOne({ vehicle_no });

        if (!vehicle) {
            return res.status(404).json({
                message: 'Vehicle not found',
                screen_message_type: 'error',
                screen_title: 'Error',
                screen_message: 'Vehicle not found in the system.',
            });
        }

        // Perform exit validation (mock example for parking duration and tariff calculation)
        const totalParkingDuration = 92846; // Mock data for total parking duration
        const tariff = {
            gst: 17.2,
            total_amount: 298.8,
            discount_amount: 29.8,
            discount_percentage: 10,
            amount_payable: is_paid ? 0 : 298.8, // Discount if paid already
        };

        // Send exit details in the response
        res.json({
            screen_message_type: "success",
            screen_title: "Thank You!",
            screen_message: "Vehicle Verified. Thank you for coming!",
            barrier_status: "open",
            max_waiting_duration: 30,
            exit_time: new Date().toISOString(),
            total_parking_duration: totalParkingDuration,
            tariff,
            class_code: vehicle.class_code,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Error validating vehicle exit',
            screen_message_type: 'error',
            screen_title: 'Error',
            screen_message: 'There was an issue validating the vehicle exit.',
        });
    }
};

// Get parking history for vehicles (add this method)
const getParkingHistory = async (req, res) => {
    try {
        const vehicles = await Vehicle.find();  // Fetch all vehicles

        if (!vehicles.length) {
            return res.status(404).json({
                message: 'No vehicles found',
                screen_message_type: 'error',
                screen_title: 'No Records',
                screen_message: 'There are no vehicles in the system.',
            });
        }

        // Map vehicles into a parking history format
        const parkingHistory = vehicles.map((vehicle) => ({
            registration_id: vehicle._id,
            entry_time: vehicle.starting_date,
            exit_time: vehicle.ending_date,
            total_parking_duration: vehicle.registration_expire_in,  // Example total parking duration
            class_code: vehicle.class_code,
        }));

        // Respond with the sorted parking history (could be based on entry time)
        res.json(parkingHistory);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Error fetching parking history',
            screen_message_type: 'error',
            screen_title: 'Error',
            screen_message: 'There was an issue while fetching parking history.',
        });
    }
};

module.exports = {
    registerVehicle,
    validateVehicleEntry,
    validateVehicleExit,
    updateVehicle,
    getAllRegisteredVehicles,
    getParkingHistory,
    deleteVehicle,  // Export delete function
};
