const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const compression = require('compression');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Performance: Gzip compress all responses ──────────────────────────
app.use(compression({ level: 6, threshold: 1024 }));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
            origin.includes('localhost') || 
            origin.includes('127.0.0.1') || 
            /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)
        ) {
            return callback(null, true);
        }
        return callback(null, origin); // Eco-back or allow production
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Static files with cache-control for faster repeat loads ──────────
app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: '7d' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d' }));

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
