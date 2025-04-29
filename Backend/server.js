require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "SmartKidsTutoring"; // fallback if DB_NAME is missing
const client = new MongoClient(uri);

let db; // Global database instance

async function connectDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log('✅ Connected to MongoDB!');
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err);
        process.exit(1);
    }
}
connectDB();

// Handle tutor applications
app.post('/api/tutors', async (req, res) => {
    const tutorData = req.body;

    try {
        if (!db) return res.status(500).json({ message: 'Database not connected.' });
        const tutorsCollection = db.collection('tutors');

        const result = await tutorsCollection.insertOne(tutorData);

        res.status(201).json({
            message: 'Tutor application submitted successfully!',
            insertedId: result.insertedId,
        });
    } catch (error) {
        console.error('❌ MongoDB Error saving tutor application:', error);
        res.status(500).json({ message: 'Failed to save tutor application.' });
    }
});

// Handle user signups
app.post('/api/signup', async (req, res) => {
    const { name, email, username, password, code } = req.body;

    if (!email || !password || !username || !name || !code) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    if (code !== 'SHARP2025') {
        return res.status(400).json({ message: 'Invalid signup code.' });
    }

    try {
        if (!db) return res.status(500).json({ message: 'Database not connected.' });
        const usersCollection = db.collection('sign_up_data');

        const existingUser = await usersCollection.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({ message: 'Username or email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await usersCollection.insertOne({
            name,
            email,
            username,
            password: hashedPassword,
            signupCode: code,
            registrationDate: new Date()
        });

        res.status(201).json({ message: 'Account created successfully!', userId: result.insertedId });

    } catch (error) {
        console.error('❌ Signup error:', error);
        res.status(500).json({ message: 'Failed to create account.' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${port}`);
});
