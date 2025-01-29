// globalController.js
const Global = require('../models/globalModel.js');

// Get global information
const getGlobalInfo = async (req, res) => {
    try {
        const globalInfo = await Global.findOne();
        if (!globalInfo) {
            return res.status(404).json({ message: 'Global data not found.' });
        }
        res.status(200).json(globalInfo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching global data.' });
    }
};

// Update global information (except classes)
// Update global information (including public parking slots)
const updateGlobalInfo = async (req, res) => {
    const updateFields = req.body;

    try {
        const globalInfo = await Global.findOne();
        if (!globalInfo) {
            return res.status(404).json({ message: 'Global data not found.' });
        }

        // If the request contains public parking slot updates
        if (updateFields.public_slots) {
            const { total, occupied, available } = updateFields.public_slots;

            // Update the public parking slots in the global data
            globalInfo.public_slots.total = total;
            globalInfo.public_slots.occupied = occupied;
            globalInfo.public_slots.available = available;

            // Recalculate available slots in global info
            globalInfo.available_slots = globalInfo.total_parking_slots - globalInfo.occupied_slots;
        }

        // Update other global information fields
        Object.keys(updateFields).forEach(field => {
            if (field !== 'public_slots') { // Don't overwrite public_slots in the main update
                globalInfo[field] = updateFields[field];
            }
        });

        globalInfo.last_maintenance_date = new Date(); // Update last maintenance date or other time-based fields
        globalInfo.last_updated_date = new Date().toISOString(); // Update the last updated timestamp
        await globalInfo.save();

        res.status(200).json({
            message: 'Global information updated successfully.',
            globalInfo,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating global information.' });
    }
};

module.exports = { getGlobalInfo, updateGlobalInfo };