require('dotenv').config(); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const cors = require('cors'); // ✅ Only once!


const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // ✅ Only once!
app.use(bodyParser.json());

// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
  } catch (err) {
    console.error('Failed to connect:', err);
    process.exit(1);
  }
}
connectDB();

// MongoDB connection check middleware
app.use(async (req, res, next) => {
  try {
    await client.db(process.env.DB_NAME).command({ ping: 1 });
    console.log('MongoDB is connected');
    next();
  } catch (err) {
    console.error('MongoDB connection issue:', err);
    res.status(500).send('Database is unavailable');
  }
});

// POST for tutor applications
app.post('/api/tutors', async (req, res) => {
  const tutorData = req.body;

  try {
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection('tutors');

    const result = await collection.insertOne(tutorData);

    res.status(201).json({
      message: 'Application submitted successfully!',
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.error('MongoDB Error:', err);
    res.status(500).json({ message: 'Failed to save application.' });
  }
});

// POST for the other form
app.post('/api/other-form', async (req, res) => {
  console.log('Other Form Data Received:', req.body);
  const formData = req.body;

  try {
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection('otherCollection');

    const result = await collection.insertOne(formData);

    res.status(201).json({
      message: 'Other form data received and saved!',
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.error('MongoDB Error:', err);
    res.status(500).json({ message: 'Failed to save other form data.' });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
