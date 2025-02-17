const Vehicle = require('../models/vehicleModel.js');
const GlobalModel = require('../models/globalModel');
const ParkingHistory = require('../models/parkingHistoryModel');
const { handleSuccess, handleError } = require('../utils/responseUtils.js');
const moment = require('moment');
const Booth = require('../models/boothModel');
const socketManager = require('../utils/socketManager');
const BarrierManager = require('../utils/barrierManager');


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

        // If class_code is public, consider it as unregistered and treat it differently
        let renewal_type, renewal_charge, expirationDate;

        if (class_code === 'public') {
            // If it's public, don't check for class existence or active status, just treat it as unregistered
            renewal_type = null;  // No renewal for public vehicles
            renewal_charge = 0;   // No charge for public vehicles
            expirationDate = null; // No expiration date for public vehicles
        } else {
            // Check if the class_code is valid and active for non-public vehicles
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

            // Get renewal details dynamically from the class
            renewal_type = classInfo.renewal_type;
            renewal_charge = classInfo.renewal_charge;

            // Calculate the expiration date based on renewal type
            const currentDate = new Date();
            if (renewal_type === 'monthly') {
                expirationDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1)); // 1 month from today
            } else if (renewal_type === 'yearly') {
                expirationDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1)); // 1 year from today
            } else {
                expirationDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1)); // Default to 1 year
            }
        }

        // Check if a vehicle with the registration number already exists
        const existingVehicle = await Vehicle.findOne({ vehicle_no });

        if (existingVehicle) {
            if (existingVehicle.class_code === 'public') {
                // If the existing vehicle is public, update the owner details and the class code
                existingVehicle.class_code = class_code;
                existingVehicle.owner_first_name = owner_first_name;
                existingVehicle.owner_last_name = owner_last_name;
                existingVehicle.ending_date = expirationDate; // Set the new expiration date if applicable
                existingVehicle.renewal_type = renewal_type; // Update renewal type if applicable
                existingVehicle.renewal_charge = renewal_charge; // Update renewal charge if applicable

                // Save the updated vehicle
                await existingVehicle.save();

                return res.status(200).json({
                    message: `Vehicle ${vehicle_no} successfully registered as ${class_code}.`,
                    registration_id: existingVehicle._id,
                    vehicle_no: existingVehicle.vehicle_no,
                    vehicle_type: existingVehicle.vehicle_type,
                    owner_first_name: existingVehicle.owner_first_name,
                    owner_last_name: existingVehicle.owner_last_name,
                    class_code: existingVehicle.class_code,
                    ending_date: existingVehicle.ending_date,
                    renewal_type: existingVehicle.renewal_type,
                    renewal_charge: existingVehicle.renewal_charge,
                });
            } else {
                return res.status(409).json({
                    message: `A vehicle with the registration number "${vehicle_no}" already exists in class "${existingVehicle.class_code}". Please verify the number.`,
                });
            }
        }

        // Create the vehicle entry with the data from the request body and dynamic values
        const newVehicle = new Vehicle({
            vehicle_no,
            vehicle_type,
            owner_first_name,
            owner_last_name,
            class_code,
            ending_date: expirationDate, // Store expiration date (null for public)
            renewal_type, // Store renewal type from class (null for public)
            renewal_charge, // Store renewal charge from class (0 for public)
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
    const { registration_id, vehicle_no } = req.query;  // Registration ID and Vehicle No. in params
    const {
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
        // Validate that at least registration_id or vehicle_no is provided
        if (!registration_id && !vehicle_no) {
            return res.status(400).json({ message: 'Either Registration ID or Vehicle No. is required' });
        }

        // Find the vehicle by registration_id or vehicle_no (case-insensitive)
        let vehicle;
        if (registration_id) {
            vehicle = await Vehicle.findById(registration_id);
        } else if (vehicle_no) {
            vehicle = await Vehicle.findOne({ vehicle_no: { $regex: new RegExp(`^${vehicle_no}$`, 'i') } }); // Case insensitive match
        }

        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found with the provided details' });
        }

        // Prepare fields to be updated
        const updatedFields = {};

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
        await Vehicle.findByIdAndUpdate(vehicle._id, updatedFields, { new: true });

        // Return updated vehicle data
        const updatedVehicle = await Vehicle.findById(vehicle._id);

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

// Helper function to emit to booth displays
const emitToBoothDisplays = (io, booth, eventName, message) => {
    if (!booth || !booth.devices) return;

    const displayDevices = booth.devices.filter(device => 
        device.device_type === 'display' && device.socket_id
    );

    displayDevices.forEach(device => {
        if (device.socket_id) {
            console.log(`Emitting ${eventName} to device ${device.device_id} in booth ${booth.booth_code}`);
            io.to(device.socket_id).emit(eventName, message);
        }
    });
};

const validateVehicleEntry = async (req, res) => {
    const { vehicle_no, entry_time, vehicle_type, booth_code } = req.body;

    try {
        const io = socketManager.getIO();
        if (!io) {
            console.error('Socket.IO not initialized');
            return res.status(500).json({
                screen_message_type: 'error',
                screen_title: 'System Error',
                screen_message: 'Communication system not initialized',
                barrier_status: 'closed'
            });
        }

        if (!vehicle_no) {
            await socketManager.emitToDevice(booth_code, 'display', 'error', 'No vehicle number found');
            return res.status(403).json({ message: "No vehicle number found" });
        }

        if (!booth_code) {
            return res.status(403).json({ 
                screen_message_type: 'error',
                screen_title: 'Missing Information',
                screen_message: 'Booth identifier is required',
                barrier_status: 'closed'
            });
        }

        // Modified booth validation logic
        let booth;
        try {
            booth = await socketManager.findBoothByIdentifier(booth_code);
            
            if (!booth) {
                await socketManager.emitToDevice(booth_code, "display", 'failed', `No booth found for identifier: ${booth_code}`);
                return res.status(404).json({
                    screen_message_type: 'error',
                    screen_title: 'Invalid Booth',
                    screen_message: 'Booth not found',
                    barrier_status: 'closed',
                });
            }

            // Check if booth is active
            if (booth.status !== 'active') {
                await socketManager.emitToDevice(booth_code, "display", 'failed', `Booth ${booth.booth_code} is inactive`);
                return res.status(403).json({
                    screen_message_type: 'error',
                    screen_title: 'Inactive Booth',
                    screen_message: 'This booth is currently inactive',
                    barrier_status: 'closed',
                });
            }

            // Check if booth is entry type
            if (booth.booth_type !== 'entry') {
                await socketManager.emitToDevice(booth_code, "display", 'failed', `Booth ${booth.booth_code} is not an entry booth`);
                return res.status(403).json({
                    screen_message_type: 'error',
                    screen_title: 'Invalid Booth Type',
                    screen_message: 'This booth is not configured for entry',
                    barrier_status: 'closed',
                });
            }

            // Fetch GlobalData from the database
            const globalData = await GlobalModel.findOne();
            if (!globalData) {
                await socketManager.emitToDevice(booth_code, "display", 'failed', 'Global parking data is not initialized.');
                return res.status(500).json({
                    screen_message_type: 'error',
                    screen_title: 'Configuration Error',
                    screen_message: 'Global parking data is not initialized.',
                    barrier_status: 'closed',
                });
            }

            // Fetch vehicle from the database
            let vehicle = await Vehicle.findOne({ vehicle_no });

            // Handle Blacklisted Vehicle
            if (vehicle && vehicle.is_blacklisted) {
                await socketManager.emitToDevice(booth_code, "display", 'failed', `Vehicle ${vehicle_no} is blacklisted and cannot enter.`);
                return res.status(403).json({
                    screen_message_type: 'error',
                    screen_title: 'Access Denied',
                    screen_message: `Vehicle ${vehicle_no} is blacklisted and cannot enter.`,
                    barrier_status: 'closed',
                });
            }

            // Handle Duplicate Entry
            if (vehicle && vehicle.status === 'parked') {
                await socketManager.emitToDevice(booth_code, "display", 'failed', `Vehicle ${vehicle_no} is already parked.`);
                return res.status(400).json({
                    screen_message_type: 'error',
                    screen_title: 'Duplicate Entry',
                    screen_message: `Vehicle ${vehicle_no} is already parked.`,
                    barrier_status: 'closed',
                });
            }

            // For Unregistered Vehicle or Vehicle with "public" class code
            if (!vehicle || vehicle.class_code === 'public') {
                // Check availability of public slots
                if (globalData.public_slots.occupied >= globalData.public_slots.total) {
                    await socketManager.emitToDevice(booth_code, "display", 'failed', 'No available public parking slots for vehicles with public class.');
                    return res.status(400).json({
                        screen_message_type: 'error',
                        screen_title: 'No Public Slots Available',
                        screen_message: 'No available public parking slots for vehicles with public class.',
                        barrier_status: 'closed',
                    });
                }

                // Increment public slot usage
                globalData.public_slots.occupied++;
                globalData.public_slots.available = globalData.public_slots.total - globalData.public_slots.occupied;
                globalData.occupied_slots++;
                globalData.available_slots = globalData.total_parking_slots - globalData.occupied_slots;

                // Save updated global data
                await globalData.save();

                // If vehicle is unregistered, add it to the database
                if (!vehicle) {
                    vehicle = new Vehicle({
                        vehicle_no,
                        vehicle_type: vehicle_type || "unknown", // Collect from frontend or default to "unknown"
                        status: 'parked',
                        starting_date: entry_time || new Date().toISOString(),
                        class_code: 'public', // Default to 'public' for unregistered vehicles
                        effective_from_date: new Date().toISOString(),
                        renewal_type: null,
                        renewal_charge: 0,
                        owner_first_name: null,
                        owner_last_name: null,
                    });

                    await vehicle.save();
                } else {
                    // If vehicle exists but has "public" class code, update its status
                    vehicle.status = 'parked';
                    vehicle.starting_date = entry_time || new Date().toISOString();
                    await vehicle.save();
                }

                // Open the barrier for entry by passing the booth code
                await BarrierManager.openBarrier(booth_code);
                
                await socketManager.emitToDevice(booth_code, "display", 'success', `Vehicle ${vehicle_no} has been validated for entry.`);
                return res.status(200).json({
                    screen_message_type: 'success',
                    screen_title: 'Public Vehicle Entry Validated',
                    screen_message: `Vehicle ${vehicle_no} has been validated for entry.`,
                    barrier_status: 'open',
                    max_waiting_duration: 30,
                    entry_time: vehicle.starting_date,
                    class_code: 'public',
                    booth_code: booth.booth_code
                });
            }

            // For Registered Vehicle with valid class codes
            const class_code = vehicle.class_code;
            const parkingClass = globalData.supported_classes.find(cls => cls.code === class_code);

            if (!parkingClass) {
                await socketManager.emitToDevice(booth_code, "display", 'failed', `Class code ${class_code} is not supported.`);
                return res.status(400).json({
                    screen_message_type: 'error',
                    screen_title: 'Invalid Class Code',
                    screen_message: `Class code ${class_code} is not supported.`,
                    barrier_status: 'closed',
                });
            }

            if (parkingClass.slots_used >= parkingClass.slots_reserved) {
                await socketManager.emitToDevice(booth_code, "display", 'failed', `No parking slots available for class ${class_code}.`);
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

            await globalData.save();

            // Open the barrier for entry
            await BarrierManager.openBarrier(booth_code);
            
            // Update vehicle status for registered vehicle
            vehicle.status = 'parked';
            vehicle.starting_date = entry_time || new Date().toISOString();
            await vehicle.save();
            await socketManager.emitToDevice(booth_code, "display", 'success', `Vehicle ${vehicle_no} has been validated for entry.`);
            return res.status(200).json({
                screen_message_type: 'success',
                screen_title: 'Vehicle Entry Validated',
                screen_message: `Vehicle ${vehicle_no} has been validated for entry.`,
                barrier_status: 'open',
                max_waiting_duration: 30,
                entry_time: vehicle.starting_date,
                class_code: vehicle.class_code,
                booth_code: booth.booth_code
            });
        } catch (error) {
            console.error('validateVehicleEntry error:', error);
            
            try {
                await socketManager.emitToDevice(booth_code, "display", 'error', {
                    message: 'Error validating vehicle entry',
                    error: error.message
                });
            } catch (socketError) {
                console.error('Error emitting socket message:', socketError);
            }

            return handleError(res, 'Error validating vehicle entry', error, 500);
        }
    } catch (error) {
        console.error('Outer validateVehicleEntry error:', error);
        return handleError(res, 'Error in vehicle entry validation', error, 500);
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
    const {
        page = 1,
        limit = 10,
        search,
        disable_pagination = 'false',
    } = req.query;

    try {
        // Fetch all active vehicles
        let vehicles = await Vehicle.find({ registration_status: 'active' });

        if (!vehicles || vehicles.length === 0) {
            return res.status(404).json({ message: 'No active vehicles found.' });
        }

        // Filter vehicles based on the search query (matches vehicle_no or owner_name)
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
            vehicles = vehicles.filter(vehicle =>
                searchRegex.test(vehicle.vehicle_no) ||
                searchRegex.test(vehicle.owner_first_name)
            );
        }

        // Total records after filtering
        const totalRecords = vehicles.length;

        if (totalRecords === 0) {
            return res.status(404).json({ message: 'No matching vehicles found.' });
        }

        // Check if pagination is disabled
        const isPaginationDisabled = disable_pagination.toLowerCase() === 'true';

        let paginatedVehicles = vehicles;
        let totalPages = 1;

        if (!isPaginationDisabled) {
            const pageNumber = parseInt(page, 10);
            const limitNumber = parseInt(limit, 10);

            if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
                return res.status(400).json({ message: 'Invalid pagination parameters.' });
            }

            totalPages = Math.ceil(totalRecords / limitNumber);

            if (pageNumber > totalPages) {
                return res.status(404).json({ message: 'Page not found.' });
            }

            const startIndex = (pageNumber - 1) * limitNumber;
            const endIndex = startIndex + limitNumber;

            paginatedVehicles = vehicles.slice(startIndex, endIndex);
        }

        // Construct response object
        const response = {
            message: 'Registered vehicles fetched successfully.',
            vehicles: paginatedVehicles,
        };

        if (!isPaginationDisabled) {
            response.pagination = {
                totalRecords,
                totalPages,
                currentPage: parseInt(page, 10),
                limit: parseInt(limit, 10),
            };
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching registered vehicles:', error);
        res.status(500).json({ message: 'Error fetching registered vehicles.' });
    }
};




// Validate vehicle exit
const validateVehicleExit = async (req, res) => {
    const { vehicle_no, is_paid, booth_code } = req.body;
    
    try {
        const io = socketManager.getIO();
        if (!io) {
            return res.status(500).json({
                screen_message_type: 'error',
                screen_title: 'System Error',
                screen_message: 'Communication system not initialized',
                barrier_status: 'closed'
            });
        }

        if (!booth_code) {
            await socketManager.emitToDevice(booth_code, "display", 'error', 'No booth identifier provided');
            return res.status(403).json({ message: "Booth identifier is required" });
        }

        // Validate booth first
        const booth = await socketManager.findBoothByIdentifier(booth_code);
        if (!booth) {
            await socketManager.emitToDevice(booth_code, "display", 'failed', `Invalid booth identifier: ${booth_code}`);
            return res.status(404).json({
                screen_message_type: 'error',
                screen_title: 'Invalid Booth',
                screen_message: 'Invalid booth identifier provided',
                barrier_status: 'closed',
            });
        }

        // Check if booth is active
        if (booth.status !== 'active') {
            await socketManager.emitToDevice(booth_code, "display", 'failed', `Booth ${booth.booth_code} is inactive`);
            return res.status(403).json({
                screen_message_type: 'error',
                screen_title: 'Inactive Booth',
                screen_message: 'This booth is currently inactive',
                barrier_status: 'closed',
            });
        }

        // Check if booth is exit type
        if (booth.booth_type !== 'exit') {
            await socketManager.emitToDevice(booth_code, "display", 'failed', `Booth ${booth.booth_code} is not an exit booth`);
            return res.status(403).json({
                screen_message_type: 'error',
                screen_title: 'Invalid Booth Type',
                screen_message: 'This booth is not configured for exit',
                barrier_status: 'closed',
            });
        }

        // Find the vehicle by vehicle_no
        const vehicle = await Vehicle.findOne({ vehicle_no });

        if (!vehicle) {
            await socketManager.emitToDevice(booth_code, "display", 'error', 'Vehicle not found');
            return handleError(res, 'Vehicle not found', null, 404);
        }

        // Check if the vehicle is blacklisted
        if (vehicle.is_blacklisted) {
            await socketManager.emitToDevice(booth_code, "display", 'failed', 'Vehicle is blacklisted and cannot exit');
            return handleError(res, 'Vehicle is blacklisted and cannot exit', null, 403);
        }

        // Check if the vehicle is already exited
        if (vehicle.status === 'exited') {
            await socketManager.emitToDevice(booth_code, "display", 'failed', 'Vehicle has already exited');
            return handleError(res, 'Vehicle has already exited', null, 400);
        }

        // Check if the vehicle is parked
        if (vehicle.status !== 'parked') {
            await socketManager.emitToDevice(booth_code, "display", 'failed', 'Vehicle is not currently parked');
            return handleError(res, 'Vehicle is not currently parked', null, 400);
        }

        // Fetch the global model data
        const globalData = await GlobalModel.findOne();

        if (!globalData) {
            await socketManager.emitToDevice(booth_code, "display", 'failed', 'Global data not found');
            return handleError(res, 'Global data not found', null, 500);
        }

        const exit_time = new Date();
        const parking_duration = Math.floor((exit_time - vehicle.starting_date) / 1000);
        const parking_duration_in_minutes = Math.ceil(parking_duration / 60);

        // Initialize pricing details
        const first_one_hour_charges = globalData.first_one_hour_charges;
        const additional_charges = globalData.additional_charges;

        let tariff_amount = 0;
        let amount_due = 0;
        let is_class_active = false;

        // Determine vehicle type (default to 4-wheeler if unknown)
        const vehicle_type = vehicle.vehicle_type || '4';
        const charge_info = additional_charges.get(vehicle_type);

        if (!charge_info) {
            await socketManager.emitToDevice(booth_code, "display", 'error', `No pricing configuration found for vehicle type "${vehicle_type}"`);
            return handleError(res, `No pricing configuration found for vehicle type "${vehicle_type}"`, null, 400);
        }

        const { interval_minutes, amount_per_interval } = charge_info;
        const first_hour_amount = first_one_hour_charges.get(vehicle_type) || 0;

        // Calculate tariff based on parking duration
        if (parking_duration_in_minutes <= 60) {
            tariff_amount = first_hour_amount;
        } else {
            const additional_minutes = parking_duration_in_minutes - 60;
            const additional_intervals = Math.ceil(additional_minutes / interval_minutes);
            tariff_amount = first_hour_amount + additional_intervals * amount_per_interval;
        }

        // Check if vehicle is a registered vehicle (has a non-public class code)
        if (vehicle.class_code && vehicle.class_code !== 'public') {
            // This is a registered vehicle - check class validity
            const classInfo = globalData.supported_classes.find(cls => cls.code === vehicle.class_code);

            if (!classInfo) {
                // Class no longer exists in supported classes - treat as unregistered
                amount_due = is_paid ? 0 : tariff_amount;
                await socketManager.emitToDevice(booth_code, "display", 'warning', `Vehicle ${vehicle_no} has invalid class code. Treating as unregistered vehicle.`);
            } else {
                // Check if the class is active
                is_class_active = classInfo.status === 'active';

                // Amount is 0 only if class is active
                amount_due = is_class_active ? 0 : (is_paid ? 0 : tariff_amount);

                // Decrement class-specific slot usage
                if (classInfo.slots_used > 0) {
                    classInfo.slots_used--;
                }
            }
        } else {
            // This is an unregistered vehicle - must pay
            amount_due = is_paid ? 0 : tariff_amount;

            // Update public slots
            if (globalData.public_slots.occupied > 0) {
                globalData.public_slots.occupied--;
                globalData.public_slots.available = globalData.public_slots.total - globalData.public_slots.occupied;
            }
        }

        // If payment is required but not paid, prevent exit
        if (amount_due > 0) {
            await socketManager.emitToDevice(booth_code, "display", 'failed', `Payment Required for vehicle ${vehicle_no}.\n Amount payable: ${amount_due}`);
            return res.status(403).json({
                screen_message_type: "error",
                screen_title: "Payment Required",
                screen_message: "Please pay the parking fee to exit.",
                barrier_status: "closed",
                tariff: {
                    total_amount: tariff_amount,
                    amount_payable: amount_due,
                },
            });
        }

        // Update global parking data
        globalData.occupied_slots--;
        globalData.available_slots = globalData.total_parking_slots - globalData.occupied_slots;

        // Save the updated global data
        await globalData.save();

        // Add a new parking history entry
        const newParkingHistory = new ParkingHistory({
            vehicle_no: vehicle.vehicle_no,
            class_code: vehicle.class_code || 'public', // Default to 'public' if no class_code
            entry_time: vehicle.starting_date,
            exit_time: exit_time,
            parking_duration: parking_duration,
            tariff: {
                gst: 0, // Assuming GST is calculated elsewhere
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

        // Open the barrier for exit by passing the booth code
        await BarrierManager.openBarrier(booth_code);

        // Final success emission
        await socketManager.emitToDevice(booth_code, "display", 'success', `Vehicle ${vehicle_no} has successfully exited`);

        // Return the same success response
        return res.json({
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
            class_code: vehicle.class_code || 'public',
            booth_code: booth.booth_code
        });

    } catch (error) {
        console.error('validateVehicleExit error:', error);
        try {
            await socketManager.emitToDevice(booth_code, "display", 'error', {
                message: 'Error validating vehicle exit',
                error: error.message
            });
        } catch (socketError) {
            console.error('Error emitting socket message:', socketError);
        }
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
    const {
        sort_order = 'desc',
        page = 1,
        limit = 10,
        from_date,
        to_date,
        search,
        disable_pagination = 'false'
    } = req.query;

    try {
        // Build the query filter
        const query = {};
        if (from_date) {
            query.entry_time = { $gte: new Date(from_date) };
        }
        if (to_date) {
            if (!query.entry_time) {
                query.entry_time = {};
            }
            query.entry_time.$lte = new Date(to_date);
        }

        // If search is provided, do a case-insensitive "like" search on vehicle_no
        if (search) {
            query.vehicle_no = { $regex: new RegExp(search, 'i') }; // Case-insensitive substring search
        }

        // Determine if pagination is disabled
        const isPaginationDisabled = disable_pagination.toLowerCase() === 'true';

        // Get total count of records that match the query
        const totalRecords = await ParkingHistory.countDocuments(query);

        if (totalRecords === 0) {
            return res.status(404).json({ message: 'No parking history found.' });
        }

        // If pagination is enabled, calculate the necessary details
        let totalPages = 1;
        let parkingHistory;

        if (!isPaginationDisabled) {
            const pageNumber = parseInt(page, 10);
            const limitNumber = parseInt(limit, 10);

            if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
                return res.status(400).json({ message: 'Invalid pagination parameters.' });
            }

            totalPages = Math.ceil(totalRecords / limitNumber);

            if (pageNumber > totalPages) {
                return res.status(404).json({ message: 'Page not found.' });
            }

            // Fetch paginated records
            parkingHistory = await ParkingHistory.find(query)
                .sort({ entry_time: sort_order === 'asc' ? 1 : -1 })
                .skip((pageNumber - 1) * limitNumber)
                .limit(limitNumber);
        } else {
            // Fetch all records without pagination
            parkingHistory = await ParkingHistory.find(query)
                .sort({ entry_time: sort_order === 'asc' ? 1 : -1 });
        }

        // Format the data for the response
        const formattedHistory = parkingHistory.map((history) => ({
            vehicle_no: history.vehicle_no,
            class_code: history.class_code,
            entry_time: history.entry_time,
            exit_time: history.exit_time,
            total_parking_duration: history.parking_duration,
            tariff: history.tariff,
        }));

        // Construct the response object
        const response = {
            message: 'Parking history fetched successfully.',
            vehicles: formattedHistory,
        };

        if (!isPaginationDisabled) {
            response.pagination = {
                totalRecords,
                totalPages,
                currentPage: parseInt(page, 10),
                limit: parseInt(limit, 10),
            };
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching parking history:', error);
        return res.status(500).json({ message: 'Error fetching parking history.' });
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
