const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');

// Use the port provided by Render or fallback to 3000 for local development
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World from SmartKidsTutoring!');
});

// Add the health check endpoint
app.get('/health', (req, res) => {
  res.sendStatus(200); // Send a 200 OK status
});

//app.listen(port, '0.0.0.0', () => {
//  console.log(`App listening on port ${port}`);
//});

//app.listen(port, '0.0.0.0', () => {
//  console.log(`Listening at http://0.0.0.0:${port}`);
//});


const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(port, '0.0.0.0', () => {
  console.log(`Secure server running on port ${port}`);
});
