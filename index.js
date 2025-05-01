require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Enhanced MongoDB configuration
const uri = process.env.MONGODB_URI || "mongodb+srv://anthonyventura2324:36kgQwCf6zqWEiDa@smartkidstutoring.jahng0c.mongodb.net/SmartKidsTutoring?retryWrites=true&w=majority&ssl=true";
const dbName = process.env.DB_NAME || "SmartKidsTutoring";

if (!uri) {
    console.error("❌ MONGODB_URI environment variable not set!");
    process.exit(1);
}

// Improved middleware configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.static(path.join(__dirname, 'Frontend')));
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));
app.use(bodyParser.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Optimized Mongo Client configuration
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    maxPoolSize: 10,  // Reduced pool size for better connection management
    retryWrites: true,
    retryReads: true,
    heartbeatFrequencyMS: 10000,
    waitQueueTimeoutMS: 15000
});

// Enhanced database connection with better error handling
let db;
let dbConnectionRetries = 0;
const maxDbConnectionRetries = 5;
const retryDelay = 3000; // 3 seconds between retries

async function connectDB() {
    try {
        console.log(`🔃 Attempting MongoDB connection (attempt ${dbConnectionRetries + 1}/${maxDbConnectionRetries})...`);
        
        await client.connect();
        await client.db('admin').command({ ping: 1 }); // Test connection
        
        db = client.db(dbName);
        console.log("✅ Successfully connected to MongoDB!");
        
        // Database initialization
        await initializeDatabase();
        
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);
        console.error("Error details:", {
            name: err.name,
            code: err.code,
            stack: err.stack
        });
        
        if (dbConnectionRetries < maxDbConnectionRetries) {
            dbConnectionRetries++;
            console.log(`⏳ Retrying connection in ${retryDelay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return connectDB();
        } else {
            console.error("💥 Maximum connection retries reached. Exiting...");
            process.exit(1);
        }
    }
}

async function initializeDatabase() {
    try {
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        const requiredCollections = ['users', 'tutors', 'enrollments', 'sessions'];
        
        for (const collection of requiredCollections) {
            if (!collectionNames.includes(collection)) {
                await db.createCollection(collection);
                console.log(`🆕 Created '${collection}' collection`);
                
                // Collection-specific indexes
                switch(collection) {
                    case 'users':
                        await db.collection('users').createIndexes([
                            { key: { username: 1 }, unique: true },
                            { key: { email: 1 }, unique: true }
                        ]);
                        break;
                    case 'tutors':
                        await db.collection('tutors').createIndexes([
                            { key: { username: 1 }, unique: true },
                            { key: { email: 1 }, unique: true }
                        ]);
                        break;
                    case 'enrollments':
                        await db.collection('enrollments').createIndex(
                            { tutorUsername: 1, studentUsername: 1 }, 
                            { unique: true }
                        );
                        break;
                }
            }
        }
        console.log("🏁 Database initialization complete");
    } catch (initErr) {
        console.error("❌ Database initialization failed:", initErr);
        throw initErr;
    }
}

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error('⛔ Error:', {
        message: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? {
            message: err.message,
            stack: err.stack
        } : undefined
    });
});

// Health check endpoint with DB status
app.get('/health', async (req, res) => {
    try {
        const dbStatus = db ? 'connected' : 'disconnected';
        const collections = db ? await db.listCollections().toArray() : [];
        
        res.status(200).json({
            status: 'OK',
            database: {
                status: dbStatus,
                collections: collections.map(c => c.name),
                connectionAttempts: dbConnectionRetries
            },
            server: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            }
        });
    } catch (healthErr) {
        console.error('Health check failed:', healthErr);
        res.status(503).json({
            status: 'UNHEALTHY',
            error: healthErr.message
        });
    }
});

// Start server after DB connection is established
async function startServer() {
    try {
        await connectDB();
        
        app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Server running on http://localhost:${port}`);
            console.log('📊 Current environment:', process.env.NODE_ENV || 'development');
            console.log('🔗 MongoDB connected to:', uri.replace(/:[^@]+@/, ':*****@'));
        });
    } catch (startupErr) {
        console.error('🔥 Failed to start server:', startupErr);
        process.exit(1);
    }
}

startServer();

// Enhanced shutdown handling
process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT. Shutting down gracefully...');
    try {
        if (client) {
            await client.close();
            console.log('📴 MongoDB connection closed');
        }
        process.exit(0);
    } catch (shutdownErr) {
        console.error('❌ Error during shutdown:', shutdownErr);
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught Exception:', err);
    process.exit(1);
});
