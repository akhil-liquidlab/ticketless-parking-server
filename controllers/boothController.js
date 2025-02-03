const Booth = require('../models/boothModel');  // Booth schema

// Controller to create a new booth
const createBooth = async (req, res) => {
    const { booth_code, location, description, booth_type, devices } = req.body;

    // Validation for required fields
    if (!booth_code || !location || !description || !booth_type) {
        return res.status(400).json({ message: 'All fields (booth_code, location, description, booth_type) are required' });
    }

    // Booth type validation
    if (!['entry', 'exit'].includes(booth_type)) {
        return res.status(400).json({ message: 'Booth type must be either "entry" or "exit"' });
    }

    // Validate devices if provided
    if (devices) {
        if (!Array.isArray(devices)) {
            return res.status(400).json({ message: 'Devices must be an array' });
        }

        for (const device of devices) {
            if (!device.device_id || !device.device_type) {
                return res.status(400).json({ message: 'Each device must have device_id and device_type' });
            }
            if (!['display', 'barrier'].includes(device.device_type)) {
                return res.status(400).json({ message: 'Device type must be either "display" or "barrier"' });
            }
        }
    }

    try {
        const existingBooth = await Booth.findOne({ 
            booth_code: { $regex: new RegExp(`^${booth_code}$`, 'i') } 
        });
        if (existingBooth) {
            return res.status(400).json({ message: 'Booth code already exists' });
        }

        const newBooth = new Booth({
            booth_code,
            location,
            description,
            booth_type,
            status: 'active',
            devices: devices || []
        });

        await newBooth.save();
        res.status(201).json({ message: 'Booth created successfully', booth: newBooth });
    } catch (error) {
        console.error('Error creating booth:', error);
        res.status(500).json({ message: 'Failed to create booth', error: error.message });
    }
};

// Controller to get all booths
const getAllBooths = async (req, res) => {
    try {
        const booths = await Booth.find();
        if (!booths || booths.length === 0) {
            return res.status(404).json({ message: 'No booths found' });
        }
        res.status(200).json(booths);
    } catch (error) {
        console.error('Error fetching booths:', error);
        res.status(500).json({ message: 'Failed to fetch booths', error: error.message });
    }
};

// Controller to add a device to a booth (display or barrier)
const addDeviceToBooth = async (req, res) => {
    const { booth_code, device_id, device_type } = req.body;

    // Validation for required fields
    if (!booth_code || !device_id || !device_type) {
        return res.status(400).json({ message: 'Booth code, device ID, and device type are required' });
    }

    // Device type validation (optional, depending on your logic)
    if (!['display', 'barrier'].includes(device_type)) {
        return res.status(400).json({ message: 'Device type must be either "display" or "barrier"' });
    }

    try {
        // Find booth by booth_code
        const booth = await Booth.findOne({ 
            booth_code: { $regex: new RegExp(`^${booth_code}$`, 'i') } 
        });
        if (!booth) {
            return res.status(404).json({ message: `Booth with code ${booth_code} not found` });
        }

        // Check if booth is inactive
        if (booth.status === 'inactive') {
            return res.status(400).json({ message: 'Cannot add device to inactive booth' });
        }

        // Check if device is already added to the booth
        const existingDevice = booth.devices.find(device => device.device_id === device_id);
        if (existingDevice) {
            return res.status(400).json({ message: `Device with ID ${device_id} already added to this booth` });
        }

        // Add the device to the booth's devices array
        booth.devices.push({ device_id, device_type });
        await booth.save();

        res.status(201).json({ message: 'Device added to booth successfully', booth });
    } catch (error) {
        console.error('Error adding device to booth:', error);
        res.status(500).json({ message: 'Failed to add device to booth', error: error.message });
    }
};

// Controller to update device information in a booth
const updateDeviceInBooth = async (req, res) => {
    const { booth_code, device_id, new_device_type } = req.body;

    // Validation for required fields
    if (!booth_code || !device_id || !new_device_type) {
        return res.status(400).json({ message: 'Booth code, device ID, and new device type are required' });
    }

    // Device type validation (optional, depending on your logic)
    if (!['display', 'barrier'].includes(new_device_type)) {
        return res.status(400).json({ message: 'Device type must be either "display" or "barrier"' });
    }

    try {
        // Find the booth by booth_code
        const booth = await Booth.findOne({ 
            booth_code: { $regex: new RegExp(`^${booth_code}$`, 'i') } 
        });
        if (!booth) {
            return res.status(404).json({ message: `Booth with code ${booth_code} not found` });
        }

        // Check if booth is inactive
        if (booth.status === 'inactive') {
            return res.status(400).json({ message: 'Cannot update device in inactive booth' });
        }

        // Find the device in the booth's devices array
        const device = booth.devices.find(dev => dev.device_id === device_id);
        if (!device) {
            return res.status(404).json({ message: `Device with ID ${device_id} not found in this booth` });
        }

        // Update the device type
        device.device_type = new_device_type || device.device_type;
        await booth.save();

        res.status(200).json({ message: 'Device updated successfully', booth });
    } catch (error) {
        console.error('Error updating device in booth:', error);
        res.status(500).json({ message: 'Failed to update device in booth', error: error.message });
    }
};

// Controller to update socket_id for a device in a booth
const updateDeviceSocketId = async (req, res) => {
    const { booth_code, device_id, socket_id } = req.body;

    if (!booth_code || !device_id || !socket_id) {
        return res.status(400).json({ message: 'Booth code, device ID, and socket ID are required' });
    }

    try {
        const booth = await Booth.findOne({ 
            booth_code: { $regex: new RegExp(`^${booth_code}$`, 'i') } 
        });
        if (!booth) {
            return res.status(404).json({ message: `Booth with code ${booth_code} not found` });
        }

        if (booth.status === 'inactive') {
            return res.status(400).json({ message: 'Cannot update socket ID for inactive booth' });
        }

        const device = booth.devices.find(dev => dev.device_id === device_id);
        if (!device) {
            return res.status(404).json({ message: `Device with ID ${device_id} not found in this booth` });
        }

        device.socket_id = socket_id;
        await booth.save();

        res.status(200).json({ message: 'Socket ID updated successfully', booth });
    } catch (error) {
        console.error('Error updating device socket ID:', error);
        res.status(500).json({ message: 'Failed to update socket ID', error: error.message });
    }
};

// Controller to send a message to a device in a booth
const sendMessageToDevice = async (req, res) => {
    const { booth_code, device_id, message } = req.body;

    // Validation for required fields
    if (!booth_code || !device_id || !message) {
        return res.status(400).json({ message: 'Booth code, device ID, and message are required' });
    }

    try {
        const booth = await Booth.findOne({ 
            booth_code: { $regex: new RegExp(`^${booth_code}$`, 'i') } 
        });
        if (!booth) {
            return res.status(404).json({ message: `Booth with code ${booth_code} not found` });
        }

        // Check if booth is inactive
        if (booth.status === 'inactive') {
            return res.status(400).json({ message: 'Cannot send message to device in inactive booth' });
        }

        const device = booth.devices.find(dev => dev.device_id === device_id);
        if (!device || !device.socket_id) {
            return res.status(400).json({ message: `Device with ID ${device_id} not connected or socket ID not found` });
        }

        const socket = req.app.locals.io.sockets.sockets.get(device.socket_id);
        if (socket) {
            socket.emit('message', message);  // Send message to the device's socket
            res.status(200).json({ message: 'Message sent to device successfully' });
        } else {
            res.status(400).json({ message: 'Device socket is not connected' });
        }
    } catch (error) {
        console.error('Error sending message to device:', error);
        res.status(500).json({ message: 'Failed to send message', error: error.message });
    }
};

// Controller to update booth
const updateBooth = async (req, res) => {
    const { booth_code } = req.params;
    const { location, description, booth_type, status, devices } = req.body;  // Add back booth_type

    try {
        const booth = await Booth.findOne({ 
            booth_code: { $regex: new RegExp(`^${booth_code}$`, 'i') } 
        });
        if (!booth) {
            return res.status(404).json({ message: `Booth with code ${booth_code} not found` });
        }

        // Validate booth_type if provided
        if (booth_type && !['entry', 'exit'].includes(booth_type)) {
            return res.status(400).json({ message: 'Booth type must be either "entry" or "exit"' });
        }

        // Validate status if provided
        if (status && !['active', 'inactive'].includes(status)) {
            return res.status(400).json({ message: 'Status must be either "active" or "inactive"' });
        }

        // Validate devices if provided
        if (devices) {
            if (!Array.isArray(devices)) {
                return res.status(400).json({ message: 'Devices must be an array' });
            }

            for (const device of devices) {
                if (!device.device_id || !device.device_type) {
                    return res.status(400).json({ message: 'Each device must have device_id and device_type' });
                }
                if (!['display', 'barrier'].includes(device.device_type)) {
                    return res.status(400).json({ message: 'Device type must be either "display" or "barrier"' });
                }
            }
        }

        // Update only provided fields
        if (location) booth.location = location;
        if (description) booth.description = description;
        if (booth_type) booth.booth_type = booth_type;  // Add back booth_type update
        if (status) booth.status = status;
        if (devices) booth.devices = devices;

        await booth.save();
        res.status(200).json({ message: 'Booth updated successfully', booth });
    } catch (error) {
        console.error('Error updating booth:', error);
        res.status(500).json({ message: 'Failed to update booth', error: error.message });
    }
};

module.exports = {
    createBooth,
    getAllBooths,
    addDeviceToBooth,
    updateDeviceInBooth,
    updateDeviceSocketId,
    sendMessageToDevice,
    updateBooth
};
