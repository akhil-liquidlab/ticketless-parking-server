const mongoose = require('mongoose');
const User = require('./models/userModel.js');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
dotenv.config();

const seedUsers = async () => {
    console.log('MONGO_URI:', process.env.MONGO_URI);

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const users = [
            { username: 'admin', password: 'admin123', email: 'admin@example.com', role: 'admin' },
            { username: 'user1', password: 'user123', email: 'user1@example.com', role: 'user' },
        ];

        // Hash passwords before saving
        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            const newUser = new User({ ...user, password: hashedPassword });
            await newUser.save();
        }

        console.log('Users seeded successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();
