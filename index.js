require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB Configuration with validation
function getMongoURI() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const username = 'anthonyventura2324';
  const password = '36kgQwCf6zqWEiDa';
  const cluster = 'cluster0.jahng0c.mongodb.net';
  const dbName = 'SmartKidsTutoring';

  if (!username || !password || !cluster || !dbName) {
    throw new Error('Missing required MongoDB configuration');
  }

  return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${cluster}/${dbName}?retryWrites=true&w=majority`;
}

const uri = getMongoURI();
console.log('Using MongoDB URI:', uri.replace(/:[^@]+@/, ':*****@'));

if (!uri || typeof uri !== 'string') {
  throw new Error('Invalid MongoDB connection string');
}

if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
  throw new Error('MongoDB connection string must start with mongodb:// or mongodb+srv://');
}

const dbName = "SmartKidsTutoring";

// Enhanced Mongo Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 10000,
  socketTimeoutMS: 30000,
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true,
  ssl: true
});

// Database connection with retry logic
let db;
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RETRIES = 5;

async function connectDB() {
  if (isConnecting || db) return;

  isConnecting = true;
  connectionAttempts++;

  try {
    console.log(`Connecting to MongoDB (attempt ${connectionAttempts})...`);
    
    await client.connect();
    db = client.db(dbName);
    
    await db.command({ ping: 1 });
    console.log('✅ MongoDB connection established and authenticated');
    
    connectionAttempts = 0;
    await ensureCollections();
    
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    
    if (connectionAttempts < MAX_RETRIES) {
      const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 10000);
      console.log(`Retrying in ${delay}ms...`);
      setTimeout(connectDB, delay);
    } else {
      console.error('Maximum connection attempts reached');
      process.exit(1);
    }
  } finally {
    isConnecting = false;
  }
}

async function ensureCollections() {
  const requiredCollections = ['tutors', 'sign_up_data'];
  const existingCollections = (await db.listCollections().toArray()).map(c => c.name);
  
  for (const col of requiredCollections) {
    if (!existingCollections.includes(col)) {
      await db.createCollection(col);
      console.log(`Created collection: ${col}`);
    }
  }
}

// Initialize connection
connectDB();

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'Frontend')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'Homepage.html'));
});

// Tutor Application Endpoint
app.post('/api/tutors', async (req, res) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database not ready' });

  const { name, email, subject, availability, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ 
      success: false,
      message: 'Name and email are required.'
    });
  }

  try {
    const result = await db.collection("tutors").insertOne({
      name,
      email,
      subject: subject || 'Not specified',
      availability: availability || 'Not specified',
      message: message || 'No additional message',
      submittedAt: new Date(),
      status: 'pending'
    });
    
    res.status(200).json({ 
      success: true,
      message: 'Application submitted successfully!',
      data: { insertedId: result.insertedId }
    });
  } catch (err) {
    console.error("Tutor application error:", err);
    res.status(500).json({ 
      success: false,
      message: 'Server error. Try again later.'
    });
  }
});

// Signup Endpoint
app.post('/api/signup', async (req, res) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database not ready' });

  const { name, email, username, password } = req.body;

  if (!name || !email || !username || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'All fields are required.'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({ 
      success: false,
      message: 'Password must be at least 8 characters'
    });
  }

  try {
    const existingUser = await db.collection("sign_up_data").findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'Username or email already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.collection("sign_up_data").insertOne({
      name,
      email,
      username,
      password: hashedPassword,
      registrationDate: new Date(),
      role: 'student',
      verified: false
    });

    res.status(201).json({ 
      success: true,
      message: 'Account created successfully!',
      data: { userId: result.insertedId }
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create account.'
    });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
