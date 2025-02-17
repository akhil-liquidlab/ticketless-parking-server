require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const Global = require('./models/globalModel'); // Adjust the path according to your project structure
const Booth = require('./models/boothModel'); // Import the Booth model
const DisplayDevice = require('./models/displayDeviceModel'); // Import the DisplayDevice model
const ANPRCamera = require('./models/anprCameraModel'); // Import the ANPRCamera model
const AndroidDevice = require('./models/androidDeviceModel'); // Import the AndroidDevice model

// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;
        if (!mongoURI) {
            throw new Error('MONGO_URI is not defined in the .env file');
        }

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

// Seed the global data
const seedGlobal = async () => {
    try {
        const globalCode = 'main-parking-space';

        // Check if the global parking space data already exists
        const existingGlobal = await Global.findOne({ code: globalCode });

        if (existingGlobal) {
            console.log(`Global data with code '${globalCode}' already exists.`);
            return;
        }

        // Create new global data with all required fields
        const newGlobalData = new Global({
            code: globalCode,
            name: 'Main Parking Space',
            total_parking_slots: 2300,
            occupied_slots: 0,
            available_slots: 2300, // total_parking_slots - occupied_slots
            total_registered_users: 0,
            system_uptime: '100.00%', // Default uptime
            last_maintenance_date: new Date().toISOString(),
            public_slots: {
                total: 300,
                occupied: 0,
                available: 300, // public_slots.total - public_slots.occupied
            },
            supported_classes: [], // No classes by default
            first_one_hour_charges: { // Now using the Map for vehicle-specific charges
                '2': 20, // 2-wheeler: ₹20
                '3': 30, // 3-wheeler: ₹30
                '4': 40, // 4-wheeler: ₹40
            },
            additional_charges: {
                '4': { interval_minutes: 5, amount_per_interval: 2.5 }, // For 4-wheelers
                '3': { interval_minutes: 5, amount_per_interval: 2.0 }, // For 3-wheelers
                '2': { interval_minutes: 5, amount_per_interval: 1.5 }, // For 2-wheelers
            },
            created_date: new Date(),
            last_updated_date: new Date(),
        });

        // Save to the database
        await newGlobalData.save();
        console.log('Global data created successfully.');

        // Seed initial booths
        const booth1 = new Booth({
            booth_code: 'B001',
            location: 'Main Entrance',
            description: 'Entry booth for the main parking area.',
            booth_type: 'entry',
            status: 'active',
            displayDevices: [], // Add display device IDs here if needed
            cameraDevices: [],   // Add ANPR camera IDs here if needed
            androidDevices: []   // Add Android device IDs here if needed
        });

        const booth2 = new Booth({
            booth_code: 'B002',
            location: 'Exit Gate',
            description: 'Exit booth for the main parking area.',
            booth_type: 'exit',
            status: 'active',
            displayDevices: [],
            cameraDevices: [],
            androidDevices: []
        });

        await booth1.save();
        await booth2.save();
        console.log('Booths created successfully.');

        // Seed Android devices
        const androidDevice1 = new AndroidDevice({
            device_id: 'android1',
            socket_id: null
        });

        const androidDevice2 = new AndroidDevice({
            device_id: 'android2',
            socket_id: null
        });

        await androidDevice1.save();
        await androidDevice2.save();
        console.log('Android devices created successfully.');

    } catch (error) {
        console.error('Error while seeding global data:', error.message);
    }
};

// Initialize the seeding process
const initializeApp = async () => {
    try {
        await connectDB(); // Connect to the database
        await seedGlobal(); // Seed the global data
    } catch (error) {
        console.error('Error during initialization:', error.message);
    } finally {
        mongoose.disconnect(); // Close the database connection
        process.exit(); // Exit the process
    }
};

// Run the seeding script
initializeApp();
