require('dotenv').config(); // To load environment variables from .env file
const mongoose = require('mongoose');
const ParkingSpace = require('./models/parkingSpaceModel'); // Adjust the path according to your project structure

// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI; // Mongo URI from environment variables
        if (!mongoURI) {
            throw new Error('MONGO_URI is not defined in .env file');
        }

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Seed method to create the first parking space
const seedParkingSpace = async () => {
    try {
        // Check if the parking space already exists
        const existingParkingSpace = await ParkingSpace.findOne({ code: 'main-prking-space' });

        if (existingParkingSpace) {
            console.log('Parking space already exists.');
            return;
        }

        // If parking space does not exist, create and insert the first parking space
        const newParkingSpace = new ParkingSpace({
            code: 'main-prking-space',
            name: 'Main Parking Space',
            total_capacity: 2300,
            slots_reserved: 0,
            public_slots: 300,
            slots_reservable: 2000,
            created_date: new Date().toISOString(),
            last_updated_date: new Date().toISOString(),
        });

        // Save to the database
        await newParkingSpace.save();
        console.log('Parking space created successfully.');
    } catch (error) {
        console.error('Error creating parking space:', error);
    }
};

// Initialize the application
const initializeApp = async () => {
    // Connect to DB
    await connectDB();

    // Seed parking space
    await seedParkingSpace();

    // Exit the process after the seed completes
    process.exit();
};

// Run the application
initializeApp();
