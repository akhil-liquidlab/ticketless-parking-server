// classController.js
const Global = require('../models/globalModel.js');

// Update an existing class
const updateClassData = async (req, res) => {
    const { code, slots_reserved, slots_used, name, renewal_type, renewal_charge, status, starting_date, ending_date } = req.body;

    try {
        const globalInfo = await Global.findOne();
        if (!globalInfo) {
            return res.status(404).json({ message: 'Global data not found.' });
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
            if (slots_reserved < 0) {
                return res.status(400).json({ message: 'Slots reserved cannot be negative.' });
            }
            classToUpdate.slots_reserved = slots_reserved;
        }

        if (slots_used !== undefined) {
            if (slots_used < 0) {
                return res.status(400).json({ message: 'Slots used cannot be negative.' });
            }
            if (slots_used > classToUpdate.slots_reserved) {
                return res.status(400).json({ message: 'Slots used cannot exceed slots reserved.' });
            }
            classToUpdate.slots_used = slots_used;
        }

        if (name) {
            classToUpdate.name = name;
        }

        // Handle status and validate renewal_type and renewal_charge if status is 'active'
        if (status) {
            classToUpdate.status = status;

            if (status === 'active') {
                if (!renewal_type || !renewal_charge) {
                    return res.status(400).json({ message: 'For active classes, both renewal_type and renewal_charge are required.' });
                }

                if (!starting_date || !ending_date) {
                    return res.status(400).json({ message: 'For active classes, both starting_date and ending_date are required.' });
                }

                classToUpdate.renewal_type = renewal_type;
                classToUpdate.renewal_charge = renewal_charge;
                classToUpdate.starting_date = starting_date;
                classToUpdate.ending_date = ending_date;
            } else {
                // If status is not active, clear renewal_type, renewal_charge, starting_date, and ending_date
                classToUpdate.renewal_type = undefined;
                classToUpdate.renewal_charge = undefined;
                classToUpdate.starting_date = undefined;
                classToUpdate.ending_date = undefined;
            }
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
    const { code, name, slots_reserved, slots_used, renewal_type, renewal_charge, status, starting_date } = req.body;

    try {
        const globalInfo = await Global.findOne();
        if (!globalInfo) {
            return res.status(404).json({ message: 'Global data not found.' });
        }

        // Ensure supported_classes is initialized as an array
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

        let ending_date;

        // Validate renewal_type, renewal_charge, and starting_date only if the class is active
        if (status === 'active') {
            if (!renewal_type || !renewal_charge || !starting_date) {
                return res.status(400).json({ message: 'For active classes, renewal_type, renewal_charge, and starting_date are required.' });
            }

            const start = new Date(starting_date);

            // Calculate ending_date based on renewal_type
            switch (renewal_type) {
                case 'monthly':
                    ending_date = new Date(start.setMonth(start.getMonth() + 1));
                    break;
                case 'yearly':
                    ending_date = new Date(start.setFullYear(start.getFullYear() + 1));
                    break;
                case 'weekly':
                    ending_date = new Date(start.setDate(start.getDate() + 7));
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid renewal_type.' });
            }
        }

        // Add new class with starting_date and calculated ending_date
        const newClass = {
            code,
            name,
            slots_reserved,
            slots_used: slots_used || 0,
            renewal_type,
            renewal_charge,
            status,
            starting_date,
            ending_date, // Use the calculated ending_date
            // expiring_in will be calculated automatically by Mongoose
        };

        // Add the new class to the global data
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

const getAllClasses = async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search,
        disable_pagination = 'false'
    } = req.query;

    try {
        // Fetch the global information
        const globalInfo = await Global.findOne();
        if (!globalInfo) {
            return res.status(404).json({ message: 'Global data not found.' });
        }

        // Ensure `supported_classes` exists
        const supportedClasses = globalInfo.supported_classes || [];

        if (supportedClasses.length === 0) {
            return res.status(404).json({ message: 'No classes found.' });
        }

        // Filter classes based on search query
        let filteredClasses = supportedClasses;
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
            filteredClasses = supportedClasses.filter(
                cls => searchRegex.test(cls.name) || searchRegex.test(cls.code)
            );
        }

        // Check if pagination is disabled
        const isPaginationDisabled = disable_pagination.toLowerCase() === 'true';

        // Total records after filtering
        const totalRecords = filteredClasses.length;

        if (totalRecords === 0) {
            return res.status(404).json({ message: 'No matching classes found.' });
        }

        let paginatedClasses = filteredClasses;
        let totalPages = 1;

        // Apply pagination if not disabled
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

            paginatedClasses = filteredClasses.slice(startIndex, endIndex);
        }

        // Construct response object
        const response = {
            message: 'Classes fetched successfully.',
            classes: paginatedClasses,
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
        console.error('Error fetching classes:', error);
        res.status(500).json({ message: 'Error fetching classes.' });
    }
};




module.exports = { updateClassData, addClassData, deleteClassData, getAllClasses };

