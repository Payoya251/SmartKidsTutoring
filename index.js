require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors'); // Added for cross-origin requests

const app = express();
const port = process.env.PORT || 3000;

// Enhanced MongoDB URI configuration
const uri = process.env.MONGODB_URI || "mongodb+srv://anthonyventura2324:36kgQwCf6zqWEiDa@smartkidstutoring.jahng0c.mongodb.net/?retryWrites=true&w=majority&appName=SmartKidsTutoring";
const dbName = "SmartKidsTutoring";

// Middleware setup
app.use(cors()); // Enable CORS
app.use(express.static(path.join(__dirname, 'Frontend')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB Client with enhanced configuration
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000,
});

// Database connection with retry logic
let db;
let isConnecting = false;

async function connectDB() {
  if (isConnecting) return;
  isConnecting = true;
  
  try {
    await client.connect();
    db = client.db(dbName);
    console.log("✅ Connected to MongoDB");
    
    // Verify collections exist or create them
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (!collectionNames.includes('tutors')) {
      await db.createCollection('tutors');
      console.log("Created 'tutors' collection");
    }
    
    if (!collectionNames.includes('sign_up_data')) {
      await db.createCollection('sign_up_data');
      console.log("Created 'sign_up_data' collection");
    }
    
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    // Retry after 5 seconds
    setTimeout(connectDB, 5000);
  } finally {
    isConnecting = false;
  }
}

connectDB();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'Homepage.html'));
});

// Enhanced tutor application endpoint
app.post('/api/tutors', async (req, res) => {
  if (!db) {
    return res.status(503).json({ message: 'Database not connected. Please try again later.' });
  }

  const { name, email, subject, availability, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ 
      message: 'Name and email are required.',
      received: { name, email, subject, availability, message }
    });
  }

  try {
    const tutorsCollection = db.collection("tutors");
    const result = await tutorsCollection.insertOne({
      name,
      email,
      subject: subject || 'Not specified',
      availability: availability || 'Not specified',
      message: message || 'No additional message',
      submittedAt: new Date(),
      status: 'pending'
    });
    
    console.log(`New tutor application from ${email}`);
    res.status(200).json({ 
      message: 'Application submitted successfully!',
      applicationId: result.insertedId
    });
    
  } catch (err) {
    console.error("Error saving tutor application:", err);
    res.status(500).json({ 
      message: 'Server error. Try again later.',
      error: err.message 
    });
  }
});

// Fixed signup endpoint with comprehensive validation
app.post('/api/signup', async (req, res) => {
  if (!db) {
    return res.status(503).json({ message: 'Database not connected. Please try again later.' });
  }

  const { name, email, username, password } = req.body;

  // Enhanced validation
  if (!name || !email || !username || !password) {
    return res.status(400).json({ 
      message: 'All fields are required.',
      required: ['name', 'email', 'username', 'password'],
      received: { name, email, username }
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  // Password strength check
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  try {
    const usersCollection = db.collection("sign_up_data");

    // Check for existing user
    const existingUser = await usersCollection.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      const conflictField = existingUser.username === username ? 'username' : 'email';
      return res.status(409).json({ 
        message: `${conflictField} already exists.`,
        conflict: conflictField
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const result = await usersCollection.insertOne({
      name,
      email,
      username,
      password: hashedPassword,
      registrationDate: new Date(),
      role: 'student', // Default role
      verified: false
    });

    console.log(`New user registered: ${username} (${email})`);
    res.status(201).json({ 
      message: 'Account created successfully!',
      userId: result.insertedId
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ 
      message: 'Failed to create account. Please try again.',
      error: err.message 
    });
  }
});

// Health check endpoint with DB status
app.get('/health', async (req, res) => {
  try {
    await db.command({ ping: 1 });
    res.status(200).json({ 
      status: 'OK',
      database: 'connected',
      collections: await db.listCollections().toArray()
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'ERROR',
      database: 'disconnected',
      error: err.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'An unexpected error occurred.',
    error: err.message 
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server...');
  await client.close();
  process.exit(0);
});
