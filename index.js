const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database
// Set mongoose options
mongoose.set('bufferCommands', false);

// Connect to MongoDB
const connectDB = async () => {
    try {
        const dbUri = process.env.USE_LOCAL_DB === 'true' 
            ? process.env.MONGODB_URI_LOCAL 
            : process.env.MONGODB_URI_ONLINE;
        
        await mongoose.connect(dbUri, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            family: 4, // Force IPv4 to avoid slow DNS resolution
        });
        console.log(`✅ MongoDB Connected Successfully (${process.env.USE_LOCAL_DB === 'true' ? 'Local' : 'Online'})`);
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.log('⚠️ Server will continue to run, but database features may fail.');
    }
};

// Import and use routes
const mainRoutes = require('./routes/index');
app.use('/api', mainRoutes);

// Routes placeholder
app.get('/', (req, res) => {
    res.send('TerraTrace API is running...');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    connectDB();
});
