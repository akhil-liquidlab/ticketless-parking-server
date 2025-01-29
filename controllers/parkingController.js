const Vehicle = require('../models/vehicleModel.js');
const GlobalModel = require('../models/globalModel');
const ParkingHistory = require('../models/parkingHistoryModel');
const { handleSuccess, handleError } = require('../utils/responseUtils.js');
const moment = require('moment');

// Register a new vehicle
const registerVehicle = async (req, res) => {
    const { vehicle_no, vehicle_type, owner_first_name, owner_last_name, class_code } = req.body;

    try {
        // Validate required fields
        const missingFields = [
            !vehicle_no ? 'vehicle_no' : null,
            !vehicle_type ? 'vehicle_type' : null,
            !owner_first_name ? 'owner_first_name' : null,
            !owner_last_name ? 'owner_last_name' : null,
            !class_code ? 'class_code' : null
        ].filter(field => field !== null);

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `All fields are required. Missing: ${missingFields.join(', ')}`,
            });
        }

        // Check if the global data exists
        const globalInfo = await GlobalModel.findOne();
        if (!globalInfo) {
            return res.status(500).json({ message: 'Global data not found. Please contact the administrator.' });
        }

        // Check if the class_code is valid and active
        const classInfo = globalInfo.supported_classes.find(cls => cls.code === class_code);
        if (!classInfo) {
            return res.status(400).json({ message: `Invalid class code "${class_code}". Please choose a valid class.` });
        }

        // Ensure the class status is active
        if (classInfo.status !== 'active') {
            return res.status(400).json({
                message: `The class status is "${classInfo.status}", which is not active. Vehicle cannot be registered.`,
            });
        }

        // Check for duplicate vehicle registration number
        const existingVehicle = await Vehicle.findOne({ vehicle_no });
        if (existingVehicle) {
            return res.status(409).json({
                message: `A vehicle with the registration number "${vehicle_no}" already exists. Please verify the number.`,
            });
        }

        // Get renewal details dynamically from the class
        const renewal_type = classInfo.renewal_type;
        const renewal_charge = classInfo.renewal_charge;

        // Calculate the expiration date based on renewal type
        const currentDate = new Date();
        let expirationDate;
        if (renewal_type === 'monthly') {
            expirationDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1)); // 1 month from today
        } else if (renewal_type === 'yearly') {
            expirationDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1)); // 1 year from today
        } else {
            expirationDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1)); // Default to 1 year
        }

        // Create the vehicle entry without unnecessary fields
        const newVehicle = new Vehicle({
            vehicle_no,
            vehicle_type,
            owner_first_name,
            owner_last_name,
            class_code,
            ending_date: expirationDate, // Store expiration date
            renewal_type, // Store renewal type from class
            renewal_charge, // Store renewal charge from class
        });

        // Save the vehicle to the database
        await newVehicle.save();

        // Return the full vehicle details in the response, including dynamic renewal info
        res.status(201).json({
            registration_id: newVehicle._id,
            vehicle_no: newVehicle.vehicle_no,
            vehicle_type: newVehicle.vehicle_type,
            owner_first_name: newVehicle.owner_first_name,
            owner_last_name: newVehicle.owner_last_name,
            class_code: newVehicle.class_code,
            ending_date: newVehicle.ending_date,
            renewal_type, // Return the dynamic renewal type
            renewal_charge, // Return the dynamic renewal charge
        });
    } catch (error) {
        console.error(error);

        // Handle specific duplicate key errors from MongoDB (Mongoose-specific error)
        if (error.code === 11000) {
            return res.status(409).json({
                message: `Duplicate vehicle registration number "${error.keyValue.vehicle_no}". Please ensure the number is unique.`,
            });
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: `Validation error: ${error.message}`,
            });
        }

        // Catch any other general errors and return a specific message
        res.status(500).json({ message: 'Internal server error. Please try again later or contact support.' });
    }
};






// module.exports = { registerVehicle };


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

const validateVehicleEntry = async (req, res) => {
    const { vehicle_no, entry_time } = req.body;

    if (!vehicle_no) {
        return res.status(403).json({ message: "No vehicle number found" });
    }

    try {
        // Fetch GlobalData from the database
        const globalData = await GlobalModel.findOne();
        if (!globalData) {
            return res.status(500).json({
                screen_message_type: 'error',
                screen_title: 'Configuration Error',
                screen_message: 'Global parking data is not initialized.',
                barrier_status: 'closed',
            });
        }

        // Fetch vehicle from the database
        const vehicle = await Vehicle.findOne({ vehicle_no });

        // Handle Blacklisted Vehicle
        if (vehicle && vehicle.is_blacklisted) {
            return res.status(403).json({
                screen_message_type: 'error',
                screen_title: 'Access Denied',
                screen_message: `Vehicle ${vehicle_no} is blacklisted and cannot enter.`,
                barrier_status: 'closed',
            });
        }

        // Handle Duplicate Entry
        if (vehicle && vehicle.status === 'parked') {
            return res.status(400).json({
                screen_message_type: 'error',
                screen_title: 'Duplicate Entry',
                screen_message: `Vehicle ${vehicle_no} is already parked.`,
                barrier_status: 'closed',
            });
        }

        // If it's an unregistered vehicle, it can park in the public slots
        if (!vehicle) {
            // Check if there are available public parking slots
            if (globalData.public_slots.occupied >= globalData.public_slots.total) {
                return res.status(400).json({
                    screen_message_type: 'error',
                    screen_title: 'No Public Slots Available',
                    screen_message: 'No available public parking slots for unregistered vehicles.',
                    barrier_status: 'closed',
                });
            }

            // Increment public slot usage
            globalData.public_slots.occupied++;
            globalData.public_slots.available = globalData.public_slots.total - globalData.public_slots.occupied;
            globalData.occupied_slots++; // Increment total occupied slots
            globalData.available_slots = globalData.total_parking_slots - globalData.occupied_slots;

            // Save updated global data
            await globalData.save();

            // Add unregistered vehicle to the Vehicle collection with default values
            const newVehicle = new Vehicle({
                vehicle_no,
                status: 'parked',
                starting_date: entry_time || new Date().toISOString(),
                class_code: 'public', // Or some default class code for unregistered vehicles
                effective_from_date: new Date().toISOString(), // Set effective_from_date to current date for unregistered vehicles
                renewal_type: null, // Set renewal_type to null
                renewal_charge: 0, // Set renewal_charge to 0 for unregistered vehicles
                owner_first_name: null, // Set owner info to null
                owner_last_name: null,
                vehicle_type: null, // Set vehicle_type to null
            });

            // Save the new vehicle data
            await newVehicle.save();

            // Success Response for unregistered vehicle entry
            return res.status(200).json({
                screen_message_type: 'success',
                screen_title: 'Unregistered Vehicle Entry Validated',
                screen_message: `Unregistered vehicle ${vehicle_no} has been validated for entry.`,
                barrier_status: 'open',
                max_waiting_duration: 30,
                entry_time: newVehicle.starting_date,
                class_code: newVehicle.class_code,
                globalData,
            });
        }

        // For Registered Vehicle
        const class_code = vehicle.class_code;

        // Check Class Capacity for registered vehicle
        const parkingClass = globalData.supported_classes.find(cls => cls.code === class_code);
        if (!parkingClass) {
            return res.status(400).json({
                screen_message_type: 'error',
                screen_title: 'Invalid Class Code',
                screen_message: `Class code ${class_code} is not supported.`,
                barrier_status: 'closed',
            });
        }

        if (parkingClass.slots_used >= parkingClass.slots_reserved) {
            return res.status(400).json({
                screen_message_type: 'error',
                screen_title: 'Class Full',
                screen_message: `No parking slots available for class ${class_code}.`,
                barrier_status: 'closed',
            });
        }

        // Update slot usage and global data for registered vehicle
        parkingClass.slots_used++;
        globalData.occupied_slots++;
        globalData.available_slots = globalData.total_parking_slots - globalData.occupied_slots;

        // Save updated global data
        await globalData.save();

        // Update vehicle status for registered vehicle
        vehicle.status = 'parked';
        vehicle.starting_date = entry_time || new Date().toISOString();
        await vehicle.save();

        // Success Response for registered vehicle entry
        return res.status(200).json({
            screen_message_type: 'success',
            screen_title: 'Vehicle Entry Validated',
            screen_message: `Vehicle ${vehicle_no} has been validated for entry.`,
            barrier_status: 'open',
            max_waiting_duration: 30,
            entry_time: vehicle.starting_date,
            class_code: vehicle.class_code,
            globalData,
        });
    } catch (error) {
        console.error("Error during validation:", error);
        return res.status(500).json({
            screen_message_type: 'error',
            screen_title: 'Error',
            screen_message: 'There was an issue validating vehicle entry.',
            error: error.message,
        });
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

// Validate vehicle exit
// Validate vehicle exit
// Validate vehicle exit
const validateVehicleExit = async (req, res) => {
    const { vehicle_no, is_paid } = req.body;

    try {
        // Find the vehicle by vehicle_no
        const vehicle = await Vehicle.findOne({ vehicle_no });

        if (!vehicle) {
            return handleError(res, 'Vehicle not found', null, 404);
        }

        // Check if the vehicle is blacklisted
        if (vehicle.is_blacklisted) {
            return handleError(res, 'Vehicle is blacklisted and cannot exit', null, 403);
        }

        // Check if the vehicle is already exited
        if (vehicle.status === 'exited') {
            return handleError(res, 'Vehicle has already exited', null, 400);
        }

        // Check if the vehicle is parked
        if (vehicle.status !== 'parked') {
            return handleError(res, 'Vehicle is not currently parked', null, 400);
        }

        // Fetch the global model data to get amount_per_minute
        const globalData = await GlobalModel.findOne();

        if (!globalData) {
            return handleError(res, 'Global data not found', null, 500);
        }

        // Fetch the class info for the vehicle
        const classInfo = globalData.supported_classes.find(cls => cls.code === vehicle.class_code);
        if (!classInfo) {
            return handleError(res, `Class code "${vehicle.class_code}" not found`, null, 400);
        }

        // Calculate parking duration (in seconds)
        const exit_time = new Date(); // Current exit time
        const parking_duration = Math.floor((exit_time - vehicle.starting_date) / 1000); // In seconds

        const amount_per_minute = globalData.amount_per_minute;

        // Calculate the tariff based on amount_per_minute (convert seconds to minutes)
        const parking_duration_in_minutes = parking_duration / 60; // Convert seconds to minutes
        const tariff_amount = parking_duration_in_minutes * amount_per_minute;

        // Check if the class is active
        let amount_due = 0;

        if (classInfo.status !== 'active') {
            // If the class is not active, the user has to pay the tariff
            amount_due = is_paid ? 0 : tariff_amount;
        } else {
            // If the class is active, there is no fee for registered vehicles
            amount_due = 0; // Registered vehicles should have no fee
        }

        // Add a new parking history entry
        const newParkingHistory = new ParkingHistory({
            vehicle_no: vehicle.vehicle_no,
            class_code: vehicle.class_code,
            entry_time: vehicle.starting_date,
            exit_time: exit_time,
            parking_duration: parking_duration,
            tariff: {
                gst: 0, // Assuming GST is calculated elsewhere or can be added here
                total_amount: tariff_amount,
                discount_amount: 0, // Add any applicable discounts here
                discount_percentage: 0, // Add discount percentage if applicable
                amount_payable: amount_due,
            },
        });

        // Save the parking history to the ParkingHistory collection
        await newParkingHistory.save();

        // Update the vehicle status to 'exited'
        vehicle.status = 'exited';
        vehicle.ending_date = exit_time;

        // Save the updated vehicle information
        await vehicle.save();

        // Return success response
        res.json({
            screen_message_type: "success",
            screen_title: "Thank You!",
            screen_message: "Vehicle Verified. Thank you for coming!",
            barrier_status: "open",
            exit_time: exit_time.toISOString(),
            total_parking_duration: parking_duration,
            tariff: {
                total_amount: tariff_amount,
                amount_payable: amount_due,
            },
            class_code: vehicle.class_code,
        });

    } catch (error) {
        console.error(error);
        return handleError(res, 'Error validating vehicle exit', error, 500);
    }
};






// Function to calculate the parking tariff based on the parking duration
const calculateTariff = (durationInSeconds) => {
    // Mock tariff calculation logic, adjust according to your business rules
    const base_rate_per_hour = 10; // Assuming a base rate of 10 currency units per hour
    const gst_percentage = 17.2; // Example GST percentage
    const discount_percentage = 10; // Example discount percentage

    const total_hours = Math.ceil(durationInSeconds / 3600); // Convert duration to hours and round up
    const total_amount = total_hours * base_rate_per_hour; // Total parking charge before tax

    // Calculate GST and discount
    const gst_amount = (total_amount * gst_percentage) / 100;
    const discount_amount = (total_amount * discount_percentage) / 100;

    const total_amount_with_gst = total_amount + gst_amount;
    const amount_payable = total_amount_with_gst - discount_amount;

    return {
        gst: gst_amount,
        total_amount: total_amount_with_gst,
        discount_amount: discount_amount,
        discount_percentage: discount_percentage,
        amount_payable: amount_payable,
    };
};

// Get parking history for vehicles
const getParkingHistory = async (req, res) => {
    const { sort_order = 'desc' } = req.query; // Use query parameter to determine sorting order ('asc' or 'desc')

    try {
        // Fetch all parking history records
        const parkingHistory = await ParkingHistory.find({}).sort({ entry_time: sort_order === 'asc' ? 1 : -1 });

        // Check if there is any parking history
        if (!parkingHistory || parkingHistory.length === 0) {
            return handleError(res, 'No parking history found', null, 404);
        }

        // Map the data to return the desired details
        const formattedHistory = parkingHistory.map((history) => ({
            vehicle_no: history.vehicle_no,
            class_code: history.class_code,
            entry_time: history.entry_time,
            exit_time: history.exit_time,
            total_parking_duration: history.parking_duration,
            tariff: history.tariff,
        }));

        // Return the parking history
        res.json({
            vehicles: formattedHistory,
        });

    } catch (error) {
        console.error(error);
        return handleError(res, 'Error fetching parking history', error, 500);
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
