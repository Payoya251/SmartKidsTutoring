require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet'); // Added for security headers
const rateLimit = require('express-rate-limit'); // Added for rate limiting

const app = express();
const port = process.env.PORT || 3000;

// Enhanced MongoDB URI configuration
const uri = process.env.MONGODB_URI || "mongodb+srv://anthonyventura2324:36kgQwCf6zqWEiDa@smartkidstutoring.jahng0c.mongodb.net/SmartKidsTutoring?retryWrites=true&w=majority";
const dbName = process.env.DB_NAME || "SmartKidsTutoring";

if (!uri) {
    console.error("❌ MONGODB_URI environment variable not set!");
    process.exit(1);
}

// Enhanced Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.static(path.join(__dirname, 'Frontend')));
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));
app.use(bodyParser.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Mongo Client with enhanced configuration
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

// Database connection with retry logic
let db;
let dbConnectionRetries = 0;
const maxDbConnectionRetries = 3;

async function connectDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log("✅ Connected to MongoDB!");

        // Create collections if they don't exist
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        const requiredCollections = ['users', 'tutors', 'enrollments', 'sessions'];
        for (const collection of requiredCollections) {
            if (!collectionNames.includes(collection)) {
                await db.createCollection(collection);
                console.log(`Created '${collection}' collection`);
                
                // Add indexes for better performance
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

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ message: 'Something broke!', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'Homepage.html'));
});

// Unified Login Route with enhanced validation
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Enhanced validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Invalid input format.' });
        }

        // Check both collections in parallel
        const [user, tutor] = await Promise.all([
            db.collection("users").findOne({ email }),
            db.collection("tutors").findOne({ email })
        ]);

        const foundUser = user || tutor;
        if (!foundUser) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, foundUser.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Determine user type and create session data
        const userType = user ? 'student' : 'tutor';
        const sessionData = {
            userId: foundUser._id,
            username: foundUser.username,
            userType,
            email: foundUser.email
        };

        res.status(200).json({
            message: 'Login successful!',
            redirect: `${userType}_dashboard.html`,
            user: sessionData
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});

// Enhanced Student Signup Route
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, username, password } = req.body;

        // Enhanced validation
        if (!name || !email || !username || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        // Check for existing user in parallel
        const [existingUsername, existingEmail] = await Promise.all([
            db.collection("users").findOne({ username }),
            db.collection("users").findOne({ email })
        ]);

        if (existingUsername || existingEmail) {
            return res.status(409).json({
                message: existingUsername ? 'Username already exists' : 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await db.collection("users").insertOne({
            name,
            email,
            username,
            password: hashedPassword,
            role: 'student',
            createdAt: new Date(),
            updatedAt: new Date(),
            tutorUsername: null,
            profileComplete: false
        });

        res.status(201).json({ 
            message: 'Student account created successfully!',
            userId: result.insertedId
        });

    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: 'Server error. Try again later.' });
    }
});

// Enhanced Tutor Registration Route
app.post('/api/tutors', async (req, res) => {
    try {
        const { name, email, username, password, subject, availability, message } = req.body;

        // Enhanced validation
        if (!name || !email || !username || !password) {
            return res.status(400).json({ message: 'All required fields must be filled.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        // Check for existing tutor in parallel
        const [existingUsername, existingEmail] = await Promise.all([
            db.collection("tutors").findOne({ username }),
            db.collection("tutors").findOne({ email })
        ]);

        if (existingUsername || existingEmail) {
            return res.status(409).json({
                message: existingUsername ? 'Username already exists' : 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await db.collection("tutors").insertOne({
            name,
            email,
            username,
            password: hashedPassword,
            subject,
            availability: availability || [],
            message: message || '',
            role: 'tutor',
            createdAt: new Date(),
            updatedAt: new Date(),
            students: [],
            maxStudents: 3,
            profileComplete: false
        });

        res.status(201).json({ message: 'Tutor account created successfully!' });

    } catch (err) {
        console.error("Tutor registration error:", err);
        res.status(500).json({ message: 'Server error. Try again later.' });
    }
});

// Enhanced Student Search
app.get('/api/search-student/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ message: 'Invalid username format' });
        }

        const student = await db.collection('users').findOne({ 
            username: { $regex: new RegExp(username, 'i') } 
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Return only necessary information
        res.status(200).json({
            name: student.name,
            username: student.username,
            email: student.email,
            hasTutor: !!student.tutorUsername
        });

    } catch (err) {
        console.error("Student search error:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Enhanced Enrollment System
app.post('/api/enroll-student', async (req, res) => {
    try {
        const { tutorUsername, studentUsername } = req.body;
        
        // Validation
        if (!tutorUsername || !studentUsername) {
            return res.status(400).json({ message: 'Both tutor and student usernames are required' });
        }

        // Transaction for data consistency
        const session = client.startSession();
        try {
            await session.withTransaction(async () => {
                const tutor = await db.collection('tutors').findOne({ username: tutorUsername }, { session });
                const student = await db.collection('users').findOne({ username: studentUsername }, { session });

                if (!tutor || !student) {
                    throw new Error('Tutor or student not found');
                }

                if (student.tutorUsername) {
                    throw new Error('Student already has a tutor');
                }

                // Check enrollment limit
                if (tutor.students && tutor.students.length >= tutor.maxStudents) {
                    throw new Error('Tutor has reached maximum student capacity');
                }

                // Update all records in transaction
                await db.collection('tutors').updateOne(
                    { username: tutorUsername },
                    { $addToSet: { students: studentUsername } },
                    { session }
                );

                await db.collection('users').updateOne(
                    { username: studentUsername },
                    { $set: { tutorUsername } },
                    { session }
                );

                await db.collection('enrollments').insertOne({
                    tutorUsername,
                    studentUsername,
                    enrollmentDate: new Date(),
                    status: 'active'
                }, { session });
            });

            res.status(200).json({ message: 'Student enrolled successfully!' });

        } finally {
            await session.endSession();
        }

    } catch (err) {
        console.error("Enrollment error:", err);
        const statusCode = err.message.includes('not found') ? 404 : 
                          err.message.includes('already') ? 409 : 
                          err.message.includes('maximum') ? 400 : 500;
        res.status(statusCode).json({ message: err.message });
    }
});

// Enhanced Tutor Students List
app.get('/api/tutor-students/:tutorUsername', async (req, res) => {
    try {
        const { tutorUsername } = req.params;
        
        const tutor = await db.collection('tutors').findOne({ username: tutorUsername });
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        const students = await db.collection('users').find({ 
            username: { $in: tutor.students || [] } 
        }).project({
            name: 1,
            username: 1,
            email: 1,
            createdAt: 1
        }).toArray();

        res.status(200).json({ 
            students,
            count: students.length,
            maxStudents: tutor.maxStudents || 3
        });

    } catch (err) {
        console.error("Tutor students error:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Enhanced Health Check
app.get('/health', async (req, res) => {
    try {
        const dbStatus = db ? 'Connected' : 'Disconnected';
        const collections = await db.listCollections().toArray();
        
        res.status(200).json({
            status: 'OK',
            uptime: process.uptime(),
            database: {
                status: dbStatus,
                collections: collections.map(c => c.name)
            },
            memoryUsage: process.memoryUsage(),
            env: process.env.NODE_ENV || 'development'
        });
    } catch (err) {
        res.status(500).json({
            status: 'ERROR',
            error: err.message
        });
    }
});

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
    console.log('Shutting down gracefully...');
    try {
        await client.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
}

// Start server
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});
