// index.js - configures Express and mounts the four routers
const express = require('express');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require('./routes/tripRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Travel Agency API',
    endpoints: ['/auth', '/users', '/trips', '/reviews']
  });
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/trips', tripRoutes);
app.use('/reviews', reviewRoutes);

// Unknown route
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Malformed JSON body or any unhandled error
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
