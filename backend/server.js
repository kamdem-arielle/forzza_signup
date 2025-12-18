require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3306;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
async function testDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('✓ MySQL Database connected successfully!');
    console.log(`✓ Connected to database: ${process.env.DB_NAME}`);
    connection.release();
  } catch (err) {
    console.log('✗ Database connection failed:', err.message);
    console.log('  Please ensure MAMP MySQL server is running on localhost:3306');
  }
}

// Test connection on startup
testDatabase();

// Import routes
const apiRoutes = require('./routes/api');

// Use routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Express API!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server is running on http://localhost:${PORT}`);
});
