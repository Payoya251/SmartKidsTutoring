require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB Configuration
const uri = process.env.MONGODB_URI; // Ensure this is in your .env file
const dbName = "SmartKidsTutoring";

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'Frontend')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Mongo Client
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Database connection
let db;
async function connectDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log("✅ Connected to MongoDB!");

        // Create collections if they don't exist
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (!collectionNames.includes('tutors')) {
            await db.createCollection('tutors');
            console.log("Created 'tutors' collection");
        }

        if (!collectionNames.includes('users')) {
            await db.createCollection('users');
            console.log("Created 'users' collection");
        }

    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
    }
}
connectDB();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'Homepage.html'));
});

// Tutor signup route (for creating tutor accounts)
app.post('/api/register/tutor', async (req, res) => {
    const { name, email, username, password, subject, availability, message } = req.body;

    if (!name || !email || !username || !password) {
        return res.status(400).json({ message: 'All fields are required for tutor registration.' });
    }

    try {
        const existingTutor = await db.collection("tutors").findOne({ username });
        if (existingTutor) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        const existingEmail = await db.collection("tutors").findOne({ email });
        if (existingEmail) {
            return res.status(409).json({ message: 'Email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.collection("tutors").insertOne({
            name,
            email,
            username,
            password: hashedPassword,
            subject,
            availability,
            message,
            registeredAt: new Date()
        });

        res.status(201).json({ message: 'Tutor account created successfully!' });
    } catch (err) {
        console.error("Error creating tutor account:", err);
        res.status(500).json({ message: 'Server error during tutor registration. Try again later.' });
    }
});

// Tutor login route
app.post('/api/login/tutor', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide both username and password.' });
    }

    try {
        const tutor = await db.collection("tutors").findOne({ username });

        if (!tutor) {
            return res.status(401).json({ message: 'Invalid username or password.' }); // Unauthorized
        }

        const isPasswordValid = await bcrypt.compare(password, tutor.password);

        if (isPasswordValid) {
            // Passwords match! Send back username and redirect to tutor dashboard
            res.status(200).json({
                message: 'Tutor login successful!',
                redirect: 'tutor_dashboard.html',
                username: tutor.username // Include the username
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password.' }); // Unauthorized
        }
    } catch (err) {
        console.error("Error during tutor login:", err);
        res.status(500).json({ message: 'Server error during tutor login. Please try again later.' });
    }
});

// User signup route (for students/parents)
app.post('/api/signup', async (req, res) => {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const existingUser = await db.collection("users").findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(409).json({ message: 'Username or email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.collection("users").insertOne({
            name,
            email,
            username,
            password: hashedPassword,
            createdAt: new Date()
        });

        res.status(200).json({ message: 'Account created successfully!' });
    } catch (err) {
        console.error("Error creating account:", err);
        res.status(500).json({ message: 'Server error. Try again later.' });
    }
});

// User login route (for students/parents)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    try {
        const user = await db.collection("users").findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' }); // Unauthorized
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {
            // Passwords match! Send back username and redirect to student dashboard
            res.status(200).json({
                message: 'Login successful!',
                redirect: 'student_dashboard.html',
                username: user.username // Include the username
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password.' }); // Unauthorized
        }
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
