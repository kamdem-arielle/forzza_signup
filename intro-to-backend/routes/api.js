const express = require('express');
const router = express.Router();

// Import route modules
const adminRoutes = require('./adminRoutes');
const signupRoutes = require('./signupRoutes');

// Mount routes
router.use('/admin', adminRoutes);
router.use('/signups', signupRoutes);

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    endpoints: {
      admin: {
        signup: 'POST /api/admin/signup',
        login: 'POST /api/admin/login'
      },
      signups: {
        create: 'POST /api/signups',
        updateStatus: 'PUT /api/signups/:id/status',
        getByStatus: 'GET /api/signups/status/:status',
        getAll: 'GET /api/signups'
      }
    }
  });
});

module.exports = router;
