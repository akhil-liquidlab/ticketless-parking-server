const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const parkingRoutes = require('./routes/parkingRoutes');
const globalRoutes = require('./routes/globalRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/global', globalRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
