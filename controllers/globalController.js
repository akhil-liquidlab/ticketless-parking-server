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
// Update global information (including public parking slots, first-hour charges, and additional charges)
const updateGlobalInfo = async (req, res) => {
    const updateFields = req.body;

    try {
        const globalInfo = await Global.findOne();
        if (!globalInfo) {
            return res.status(404).json({ message: 'Global data not found.' });
        }

        // Handle updates to the first one-hour charges by vehicle type
        if (updateFields.first_one_hour_charges) {
            const { '2': twoWheelerCharge, '3': threeWheelerCharge, '4': fourWheelerCharge } = updateFields.first_one_hour_charges;

            // Ensure that charges are set for all vehicle types (2, 3, 4)
            if (twoWheelerCharge) globalInfo.first_one_hour_charges['2'] = twoWheelerCharge;
            if (threeWheelerCharge) globalInfo.first_one_hour_charges['3'] = threeWheelerCharge;
            if (fourWheelerCharge) globalInfo.first_one_hour_charges['4'] = fourWheelerCharge;
        }

        // Handle updates to additional charges by vehicle type
        if (updateFields.additional_charges) {
            const { '2': twoWheelerAdditional, '3': threeWheelerAdditional, '4': fourWheelerAdditional } = updateFields.additional_charges;

            // Ensure that charges are set for all vehicle types (2, 3, 4)
            if (twoWheelerAdditional) {
                globalInfo.additional_charges['2'] = twoWheelerAdditional;
            }
            if (threeWheelerAdditional) {
                globalInfo.additional_charges['3'] = threeWheelerAdditional;
            }
            if (fourWheelerAdditional) {
                globalInfo.additional_charges['4'] = fourWheelerAdditional;
            }
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
            if (field !== 'public_slots' && field !== 'first_one_hour_charges' && field !== 'additional_charges') { // Don't overwrite specific fields
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
