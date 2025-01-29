const globalData = {
    total_parking_slots: 1000,
    occupied_slots: 600,
    available_slots: 400,
    total_registered_users: 1250,
    system_uptime: "99.99%",
    last_maintenance_date: "2024-12-15T10:00:00Z",
    supported_classes: [
        { code: "google-llc-21", name: "Google LLC 21", slots_reserved: 100, slots_used: 50 },
        { code: "amazon-hq-5", name: "Amazon HQ 5", slots_reserved: 150, slots_used: 120 },
        { code: "apple-campus-1", name: "Apple Campus 1", slots_reserved: 200, slots_used: 180 },
    ],
    public_slots: {
        total: 550,
        occupied: 250,
        available: 300,
    },
};

// Get global information
const getGlobalInfo = (req, res) => {
    res.json(globalData);
};

// Update global data (e.g., class or public slots)
const updateGlobalData = (req, res) => {
    const { code, name, slots_reserved, slots_used, public_slots } = req.body;

    // Validate input
    if (!code && !public_slots) {
        return res.status(400).json({ message: "No data provided to update" });
    }

    // Update class data if code is provided
    if (code) {
        const classToUpdate = globalData.supported_classes.find(cls => cls.code === code);

        if (!classToUpdate) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Update class properties
        classToUpdate.name = name || classToUpdate.name;
        classToUpdate.slots_reserved = slots_reserved || classToUpdate.slots_reserved;
        classToUpdate.slots_used = slots_used || classToUpdate.slots_used;

        // Validate slots_used does not exceed slots_reserved
        if (classToUpdate.slots_used > classToUpdate.slots_reserved) {
            return res.status(400).json({ message: "Slots used cannot exceed slots reserved" });
        }
    }

    // Update public slots if provided
    if (public_slots) {
        globalData.public_slots.total = public_slots.total || globalData.public_slots.total;
        globalData.public_slots.occupied = public_slots.occupied || globalData.public_slots.occupied;
        globalData.public_slots.available = globalData.public_slots.total - globalData.public_slots.occupied;
    }

    // Recalculate total occupied and available slots
    const totalReservedUsed = globalData.supported_classes.reduce((sum, cls) => sum + cls.slots_used, 0);
    globalData.occupied_slots = totalReservedUsed + globalData.public_slots.occupied;
    globalData.available_slots = globalData.total_parking_slots - globalData.occupied_slots;

    res.json({
        message: "Global data updated successfully",
        updatedClass: code ? globalData.supported_classes.find(cls => cls.code === code) : null,
        public_slots: globalData.public_slots,
        globalData,
    });
};

module.exports = { getGlobalInfo, updateGlobalData };
