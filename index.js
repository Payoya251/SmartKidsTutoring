// ver 1.1
const express = require('express');
const path = require('path');
const app = express();

const port = process.env.PORT || 3000;

// Serve static files from the Frontend folder
app.use(express.static(path.join(__dirname, 'Frontend')));

// Explicitly serve index.html for the root path AFTER setting up static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'Homepage.html'));
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`App listening on port ${port}`);
});

/*
// check mongodb connection
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectDB() {
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
  } catch (err) {
    console.error('🚨 Error de conexión a MongoDB:', err);
    process.exit(1); // Sale si falla la conexión
  }
}
connectDB();
*/

