const express = require('express');
const app = express();

// Use the port provided by Render or fallback to 3000 for local development
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World from SmartKidsTutoring!');
});

app.listen(port, () => {
  console.log(`App listening at port ${port}`);
});
