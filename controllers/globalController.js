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
const updateGlobalInfo = async (req, res) => {
    const updateFields = req.body;

    try {
        const globalInfo = await Global.findOne();
        if (!globalInfo) {
            return res.status(404).json({ message: 'Global data not found.' });
        }

        // Update only global information fields (excluding classes)
        Object.keys(updateFields).forEach(field => {
            if (field !== 'classes') {
                globalInfo[field] = updateFields[field];
            }
        });

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