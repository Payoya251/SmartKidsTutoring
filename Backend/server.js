require('dotenv').config(); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; // Use a port, process.env.PORT is for Render

app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.json()); // Parse JSON bodies

// MongoDB Connection
const uri = process.env.MONGODB_URI; // From .env file
const client = new MongoClient(uri);

async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
  } catch (err) {
    console.error('Failed to connect:', err);
    process.exit(1); // Exit if connection fails
  }
}
connectDB();

const cors = require('cors');
app.use(cors({origin: 'http://localhost:3000'}));

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


// 3. Handle the POST request from the form
app.post('/api/tutors', async (req, res) => {
  const tutorData = req.body; // Data from the form

  try {
    const db = client.db(process.env.DB_NAME);  //  database name
    const collection = db.collection('tutors'); //  collection name

    const result = await collection.insertOne(tutorData);

    res.status(201).json({ // 201 Created
      message: 'Application submitted successfully!',
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.error('MongoDB Error:', err);
    res.status(500).json({ message: 'Failed to save application.' });
  }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});

//newcode to see if the data arrives ti backend
app.post('http://localhost:5000/api/tutors', async (req, res) => {
  console.log('Tutor Data Received:', req.body); // Debugging
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
