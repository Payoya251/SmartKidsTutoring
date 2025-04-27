require('dotenv').config(); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcrypt'); // Don't forget to require bcrypt

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB!');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
}
connectDB();

app.post('/api/tutors', async (req, res) => {
    const tutorData = req.body;

    try {
        const db = client.db(process.env.DB_NAME);
        const tutorsCollection = db.collection('tutors'); // Collection name for tutor applications

        const result = await tutorsCollection.insertOne(tutorData);

        res.status(201).json({
            message: 'Tutor application submitted successfully!',
            insertedId: result.insertedId,
        });
    } catch (error) {
        console.error('MongoDB Error saving tutor application:', error);
        res.status(500).json({ message: 'Failed to save tutor application.' });
    }
});

app.post('/api/signup', async (req, res) => {
    const { name, email, username, password, code } = req.body;

    // --- Code Verification Logic (Implement your actual logic here) ---
    // For demonstration, I'm using a simple check. Replace this!
    if (code !== 'SHARP2025') {
        return res.status(400).json({ message: 'Invalid signup code.' });
    }

    try {
        const db = client.db(process.env.DB_NAME); // Connect to your main database ("USERS" as per .env)
        const usersCollection = db.collection('sign_up_data'); // Use the "sign_up_data" collection

        // Check if the username or email already exists
        const existingUser = await usersCollection.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({ message: 'Username or email already exists.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save the new user to the "sign_up_data" collection
        const result = await usersCollection.insertOne({
            name,
            email,
            username,
            password: hashedPassword,
            signupCode: code, // You might want to store the code for auditing or other purposes
            registrationDate: new Date()
        });

        res.status(201).json({ message: 'Account created successfully!', userId: result.insertedId });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Failed to create account.' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});
