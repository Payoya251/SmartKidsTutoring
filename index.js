/* ver 1.0
const express = require('express');
const app = express();

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World from SmartKidsTutoring!');
});

// Use folder Frontend to use the html code from there
//app.use(express.static(path.join(__dirname, 'Frontend')));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`App listening on port ${port}`);
});
*/


// ver 1.1
const express = require('express');
const path = require('path'); // Added this line
const app = express();

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Hello World from SmartKidsTutoring!');
});

// Use folder Frontend to use the html code from there
app.use(express.static(path.join(__dirname, 'Frontend')));

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`App listening on port ${port}`);
});
