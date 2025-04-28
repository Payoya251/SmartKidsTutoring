require('dotenv').config(); // Load environment variables (if you are using .env for MongoDB URI)
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcryptjs'); // Import bcrypt

const app = express();
const port = process.env.PORT || 3000;

// MongoDB URI (it's directly here, consider using .env)
const uri = "mongodb+srv://anthonyventura2324:36kgQwCf6zqWEiDa@smartkidstutoring.jahng0c.mongodb.net/?retryWrites=true&w=majority&appName=SmartKidsTutoring";
const dbName = "SmartKidsTutoring"; // Consistent database name

// Middleware
app.use(express.static(path.join(__dirname, 'Frontend')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Mongo Client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to MongoDB once
let db;
async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}
connectDB();

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'Homepage.html'));
});

// POST route for tutor application form
app.post('/api/tutors', async (req, res) => {
  const { name, email, subject, availability, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required.' });
  }

  try {
    const tutorsCollection = db.collection("tutors"); // Consistent collection name
    const result = await tutorsCollection.insertOne({
      name,
      email,
      subject,
      availability,
      message,
      submittedAt: new Date(),
    });
    res.status(200).json({ message: 'Application submitted successfully!' });
  } catch (err) {
    console.error("❌ Error saving tutor application:", err);
    res.status(500).json({ message: 'Server error. Try again later.' });
  }
});

// POST route for signup
app.post('/api/signup', async (req, res) => {
  const { name, email, username, password } = req.body;

  if (!name || !email || !username || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const usersCollection = db.collection("sign_up_data"); // Consistent collection name for signup data

    // Check if username or email already exists
    const existingUser = await usersCollection.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await usersCollection.insertOne({
      name,
      email,
      username,
      password: hashedPassword,
      registrationDate: new Date(),
    });

    res.status(201).json({ message: 'Account created successfully!' });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ message: 'Failed to create account.' });
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
