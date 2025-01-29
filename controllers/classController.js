// classController.js
const Global = require('../models/globalModel.js');

// Update an existing class
const updateClassData = async (req, res) => {
    const { code, slots_reserved, slots_used, name } = req.body;

    try {
        const globalInfo = await Global.findOne();
        if (!globalInfo) {
            return res.status(404).json({ message: 'Global data not found.' });
        }

        // Ensure `supported_classes` is initialized as an array
        if (!globalInfo.supported_classes) {
            globalInfo.supported_classes = [];
        }

        // Find the class to update
        const classToUpdate = globalInfo.supported_classes.find(
            cls => cls.code.toLowerCase() === code.toLowerCase()
        );

        if (!classToUpdate) {
            return res.status(404).json({ message: 'Class not found.' });
        }

        // Update fields if provided
        if (slots_reserved !== undefined) {
            classToUpdate.slots_reserved = slots_reserved;
        }

        if (slots_used !== undefined) {
            if (slots_used > classToUpdate.slots_reserved) {
                return res.status(400).json({ message: 'Slots used cannot exceed slots reserved.' });
            }
            classToUpdate.slots_used = slots_used;
        }

        if (name) {
            classToUpdate.name = name;
        }

        // Save the updated global data
        await globalInfo.save();

        res.status(200).json({
            message: 'Class updated successfully.',
            updatedClass: classToUpdate,
        });
    } catch (error) {
        console.error('Error updating class data:', error);
        res.status(500).json({ message: 'Error updating class data.' });
    }
};

const addClassData = async (req, res) => {
    const { code, name, slots_reserved, slots_used } = req.body;

    try {
        const globalInfo = await Global.findOne();
        if (!globalInfo) {
            return res.status(404).json({ message: 'Global data not found.' });
        }

        // Ensure `supported_classes` is initialized as an array
        if (!globalInfo.supported_classes) {
            globalInfo.supported_classes = [];
        }

        // Check if the class already exists
        const classExists = globalInfo.supported_classes.some(
            cls => cls.code.toLowerCase() === code.toLowerCase()
        );
        if (classExists) {
            return res.status(400).json({ message: 'Class with this code already exists.' });
        }

        // Validate slots
        if (slots_reserved < 0 || (slots_used !== undefined && slots_used < 0)) {
            return res.status(400).json({ message: 'Slots values cannot be negative.' });
        }

        // Add new class
        const newClass = { code, name, slots_reserved, slots_used: slots_used || 0 };
        globalInfo.supported_classes.push(newClass);

        // Save updated global data
        await globalInfo.save();

        res.status(201).json({
            message: 'Class added successfully.',
            newClass,
        });
    } catch (error) {
        console.error('Error adding class data:', error);
        res.status(500).json({ message: 'Error adding class data.' });
    }
};

// Delete a class
const deleteClassData = async (req, res) => {
    const { code } = req.params;

    try {
        const globalInfo = await Global.findOne();
        if (!globalInfo) {
            return res.status(404).json({ message: 'Global data not found.' });
        }

        const classIndex = globalInfo.classes.findIndex(cls => cls.code.toLowerCase() === code.toLowerCase());
        if (classIndex === -1) {
            return res.status(404).json({ message: 'Class not found.' });
        }

        const deletedClass = globalInfo.classes.splice(classIndex, 1);
        await globalInfo.save();

        res.status(200).json({
            message: 'Class deleted successfully.',
            deletedClass,
        });
    } catch (error) {
        console.error('Error deleting class data:', error);
        res.status(500).json({ message: 'Error deleting class data.' });
    }
};

module.exports = { updateClassData, addClassData, deleteClassData };
