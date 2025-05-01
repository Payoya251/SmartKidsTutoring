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

// MongoDB configuration
const uri = process.env.MONGODB_URI || "mongodb+srv://anthonyventura2324:36kgQwCf6zqWEiDa@smartkidstutoring.jahng0c.mongodb.net/SmartKidsTutoring?retryWrites=true&w=majority&directConnection=true&ssl=true";
const dbName = process.env.DB_NAME || "SmartKidsTutoring";

if (!uri) {
    console.error("❌ MONGODB_URI environment variable not set!");
    process.exit(1);
}

// Middleware (without Helmet)
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

// Mongo Client configuration
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 50,
    retryWrites: true,
    retryReads: true
});

// Database connection
let db;
let dbConnectionRetries = 0;
const maxDbConnectionRetries = 3;

async function connectDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log("✅ Connected to MongoDB!");

        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        const requiredCollections = ['users', 'tutors', 'enrollments', 'sessions'];
        for (const collection of requiredCollections) {
            if (!collectionNames.includes(collection)) {
                await db.createCollection(collection);
                console.log(`Created '${collection}' collection`);
                
                if (collection === 'users') {
                    await db.collection('users').createIndex({ username: 1 }, { unique: true });
                    await db.collection('users').createIndex({ email: 1 }, { unique: true });
                }
                if (collection === 'tutors') {
                    await db.collection('tutors').createIndex({ username: 1 }, { unique: true });
                    await db.collection('tutors').createIndex({ email: 1 }, { unique: true });
                }
                if (collection === 'enrollments') {
                    await db.collection('enrollments').createIndex({ tutorUsername: 1, studentUsername: 1 }, { unique: true });
                }
            }
        }

    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
        if (dbConnectionRetries < maxDbConnectionRetries) {
            dbConnectionRetries++;
            console.log(`Retrying connection (attempt ${dbConnectionRetries})...`);
            setTimeout(connectDB, 5000);
        } else {
            console.error("Max connection retries reached. Exiting...");
            process.exit(1);
        }
    }
}
connectDB();

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ message: 'Something broke!', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// Routes remain unchanged from your original implementation
// ... (Keep all your existing routes exactly as they were)

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        database: db ? 'Connected' : 'Disconnected'
    });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    try {
        await client.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
});
