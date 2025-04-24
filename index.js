const express = require('express');
const app = express();

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

app.listen(port, '0.0.0.0', () => {
  console.log(`Listening at http://0.0.0.0:${port}`);
});
