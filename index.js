const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// Routes
app.use('/auth', authRoutes);

// Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
